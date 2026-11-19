package com.teguwaz.channel;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.teguwaz.channel.ChannelDtos.ChannelRequest;
import com.teguwaz.channel.ChannelDtos.ChannelResponse;
import com.teguwaz.channel.ChannelDtos.PlatformInfo;
import com.teguwaz.channel.ChannelDtos.YouTubeStats;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.connection.OAuthState;
import com.teguwaz.connection.PlatformProperties;
import com.teguwaz.connection.TokenCipher;
import com.teguwaz.connection.YouTubeClient;
import com.teguwaz.connection.YouTubeClient.Day;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * The user's channels: any number, on any platform, entered by name and link.
 * YouTube channels can additionally be connected for statistics.
 */
@Service
public class ChannelService {

    private static final Logger log = LoggerFactory.getLogger(ChannelService.class);
    static final int MAX_CHANNELS = 50;
    private static final int REPORT_DAYS = 28;

    static final Map<String, String> NAMES = Map.of(
            "youtube", "YouTube", "tiktok", "TikTok", "instagram", "Instagram", "facebook", "Facebook",
            "x", "X (Twitter)", "telegram", "Telegram", "website", "Website or blog", "other", "Other");
    static final List<String> ORDER = List.of("youtube", "tiktok", "instagram", "facebook", "x", "telegram", "website", "other");

    private final ChannelRepository repo;
    private final PlatformProperties props;
    private final YouTubeClient youtube;
    private final OAuthState state;
    private final TokenCipher cipher;

    public ChannelService(ChannelRepository repo, PlatformProperties props, YouTubeClient youtube) {
        this.repo = repo;
        this.props = props;
        this.youtube = youtube;
        this.state = new OAuthState(props.stateKey(), Clock.systemUTC());
        this.cipher = props.encryptionKey() == null || props.encryptionKey().isBlank() ? null : new TokenCipher(props.encryptionKey());
    }

    public List<PlatformInfo> platforms() {
        return ORDER.stream().map(p -> new PlatformInfo(p, NAMES.get(p), statsSupported(p), statsAvailable(p), setupHint(p))).toList();
    }

    public Flux<ChannelResponse> list(UUID userId) {
        return repo.findByUserIdOrderByCreatedAtAsc(userId).map(this::toResponse);
    }

    public Mono<ChannelResponse> create(UUID userId, ChannelRequest req) {
        String url = normalizeUrl(req.url());
        return repo.countByUserId(userId)
                .flatMap(n -> n >= MAX_CHANNELS
                        ? Mono.<Channel>error(new BadRequestException("You can add up to " + MAX_CHANNELS + " channels"))
                        : repo.save(Channel.create(userId, req.platform(), req.name().trim(), url)))
                .map(this::toResponse);
    }

    public Mono<ChannelResponse> update(UUID userId, UUID id, ChannelRequest req) {
        String url = normalizeUrl(req.url());
        return find(userId, id)
                .flatMap(c -> {
                    if (c.connected() && !c.platform().equals(req.platform())) {
                        return Mono.error(new BadRequestException("Disconnect stats before changing the platform"));
                    }
                    return repo.save(c.withDetails(req.platform(), req.name().trim(), url));
                })
                .map(this::toResponse);
    }

    public Mono<Void> delete(UUID userId, UUID id) {
        return find(userId, id).flatMap(c -> revokeQuietly(c).then(repo.delete(c)));
    }

    /** Starts OAuth for one channel so its stats can be read. */
    public Mono<String> startConnect(UUID userId, UUID id) {
        return find(userId, id).flatMap(c -> {
            if (!statsSupported(c.platform())) {
                return Mono.error(new BadRequestException(NAMES.get(c.platform()) + " stats are not supported yet. " + setupHint(c.platform())));
            }
            if (!statsAvailable(c.platform())) {
                return Mono.error(new BadRequestException("YouTube stats are not set up on this server yet. " + setupHint("youtube")));
            }
            return Mono.just(youtube.authorizeUrl(props.youtube(), state.create(userId, c.platform(), c.id())));
        });
    }

    /** The platform redirects the browser here; we attach the tokens to the channel that asked. */
    public Mono<URI> callback(String platform, String code, String stateValue, String error) {
        if (error != null) {
            return Mono.just(frontend("error", "access_denied".equals(error) ? "You cancelled the connection." : error));
        }
        var payload = state.verify(stateValue, platform);
        if (payload.isEmpty() || code == null || !"youtube".equals(platform) || cipher == null) {
            return Mono.just(frontend("error", "The connection link expired or was not valid. Please try again."));
        }
        UUID userId = payload.get().userId();
        UUID channelId = payload.get().channelId();
        return find(userId, channelId)
                .flatMap(c -> youtube.exchangeCode(props.youtube(), code)
                        .flatMap(t -> youtube.myChannel(t.accessToken())
                                .flatMap(ch -> repo.save(c.withConnection(ch.id(), ch.title(), cipher.encrypt(t.accessToken()),
                                        cipher.encrypt(t.refreshToken()), expiry(t.expiresInSeconds()), t.scope())))))
                .map(saved -> frontend("connected", saved.id().toString()))
                .onErrorResume(e -> {
                    log.warn("YouTube connection failed: {}", e.getMessage());
                    String msg = e.getMessage() != null && e.getMessage().contains("channels_account_uq")
                            ? "That YouTube channel is already connected to another of your channels."
                            : "YouTube did not accept the connection: " + e.getMessage();
                    return Mono.just(frontend("error", msg));
                });
    }

    public Mono<ChannelResponse> disconnect(UUID userId, UUID id) {
        return find(userId, id).flatMap(c -> revokeQuietly(c).then(repo.save(c.disconnected()))).map(this::toResponse);
    }

    public Mono<YouTubeStats> stats(UUID userId, UUID id) {
        return find(userId, id)
                .flatMap(c -> c.connected() && "youtube".equals(c.platform())
                        ? Mono.just(c)
                        : Mono.<Channel>error(new BadRequestException("Connect this channel's stats first")))
                .flatMap(this::freshToken)
                .flatMap(tc -> {
                    LocalDate end = LocalDate.now(ZoneOffset.UTC).minusDays(1);
                    LocalDate start = end.minusDays(REPORT_DAYS - 1);
                    Mono<List<Day>> days = youtube.dailyReport(tc.token(), start, end).onErrorResume(e -> {
                        log.info("YouTube Analytics unavailable: {}", e.getMessage());
                        return Mono.just(List.of());
                    });
                    return youtube.myChannel(tc.token()).zipWith(days)
                            .flatMap(t -> repo.save(tc.channel().synced()).thenReturn(toStats(t.getT1(), t.getT2())));
                });
    }

    // ---- helpers ----

    private Mono<Channel> find(UUID userId, UUID id) {
        return repo.findByIdAndUserId(id, userId).switchIfEmpty(Mono.error(new NotFoundException("Channel", id)));
    }

    static boolean statsSupported(String platform) {
        return "youtube".equals(platform);
    }

    private boolean statsAvailable(String platform) {
        return statsSupported(platform) && props.youtube().configured() && cipher != null;
    }

    static String setupHint(String platform) {
        return switch (platform) {
            case "youtube" -> "Create an OAuth client (Web application) in Google Cloud, enable the YouTube Data API v3 and "
                    + "YouTube Analytics API, then set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY on the backend.";
            case "instagram" -> "Stats coming next: needs a Meta app with Instagram API access (Business or Creator accounts) and Meta's app review.";
            case "tiktok" -> "Stats coming next: needs a TikTok for Developers app approved for the Display API.";
            case "facebook" -> "Stats coming next: needs a Meta app with Pages access and Meta's app review.";
            default -> "This channel is saved as a link. Stats are not available for it.";
        };
    }

    /** Accepts "youtube.com/@name" or a full URL; stores https URLs only. */
    static String normalizeUrl(String raw) {
        String u = raw.trim();
        if (!u.matches("(?i)^https?://.*")) {
            u = "https://" + u;
        }
        URI uri;
        try {
            uri = URI.create(u);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("That link doesn't look right");
        }
        String host = uri.getHost();
        if (host == null || !host.contains(".") || host.length() > 253) {
            throw new BadRequestException("That link doesn't look right");
        }
        String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https") && !scheme.equals("http")) {
            throw new BadRequestException("Links must start with https://");
        }
        return u.replaceFirst("(?i)^http://", "https://");
    }

    private record TokenAndChannel(String token, Channel channel) {
    }

    private Mono<TokenAndChannel> freshToken(Channel c) {
        if (cipher == null) {
            return Mono.error(new BadRequestException("TOKEN_ENCRYPTION_KEY is not set on the server"));
        }
        if (c.tokenExpiresAt() != null && c.tokenExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return Mono.just(new TokenAndChannel(cipher.decrypt(c.accessToken()), c));
        }
        if (c.refreshToken() == null) {
            return Mono.error(new BadRequestException("YouTube access expired. Please connect again."));
        }
        return youtube.refresh(props.youtube(), cipher.decrypt(c.refreshToken()))
                .flatMap(t -> repo.save(c.withTokens(cipher.encrypt(t.accessToken()), cipher.encrypt(t.refreshToken()), expiry(t.expiresInSeconds())))
                        .map(saved -> new TokenAndChannel(t.accessToken(), saved)));
    }

    private Mono<Void> revokeQuietly(Channel c) {
        if (!c.connected() || cipher == null || !"youtube".equals(c.platform())) {
            return Mono.empty();
        }
        String token = cipher.decrypt(c.refreshToken() != null ? c.refreshToken() : c.accessToken());
        return youtube.revoke(token).onErrorResume(e -> Mono.empty());
    }

    public static YouTubeStats toStats(YouTubeClient.Channel ch, List<Day> days) {
        long views = days.stream().mapToLong(Day::views).sum();
        long likes = days.stream().mapToLong(Day::likes).sum();
        long comments = days.stream().mapToLong(Day::comments).sum();
        long shares = days.stream().mapToLong(Day::shares).sum();
        long subs = days.stream().mapToLong(Day::subscribersGained).sum();
        double engagement = views == 0 ? 0 : Math.round((likes + comments + shares) * 1000.0 / views) / 10.0;
        boolean analytics = !days.isEmpty();
        return new YouTubeStats(ch.title(), ch.subscribers(), ch.views(), ch.videos(), REPORT_DAYS, views, likes, comments,
                shares, subs, engagement, analytics,
                analytics ? null : "Daily analytics were not returned. New channels or missing permission can cause this.", days);
    }

    private ChannelResponse toResponse(Channel c) {
        return new ChannelResponse(c.id(), c.platform(), c.name(), c.url(), statsSupported(c.platform()), statsAvailable(c.platform()),
                c.connected(), c.accountName(), c.connectedAt(), c.lastSyncedAt(), c.createdAt());
    }

    private static Instant expiry(long seconds) {
        return Instant.now().plusSeconds(Math.max(60, seconds));
    }

    private URI frontend(String key, String value) {
        return UriComponentsBuilder.fromUriString(props.frontendUrl()).path("/creator").queryParam(key, value).encode().build().toUri();
    }
}
