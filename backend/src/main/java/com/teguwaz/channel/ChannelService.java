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
import com.teguwaz.channel.ChannelDtos.PublicStats;
import com.teguwaz.channel.ChannelDtos.SocialStats;
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
    private final com.teguwaz.connection.TikTokClient tiktok;
    private final com.teguwaz.connection.InstagramClient instagram;
    private final OAuthState state;
    private final TokenCipher cipher;

    public ChannelService(ChannelRepository repo, PlatformProperties props, YouTubeClient youtube,
                          com.teguwaz.connection.TikTokClient tiktok, com.teguwaz.connection.InstagramClient instagram) {
        this.repo = repo;
        this.props = props;
        this.youtube = youtube;
        this.tiktok = tiktok;
        this.instagram = instagram;
        this.state = new OAuthState(props.stateKey(), Clock.systemUTC());
        this.cipher = props.encryptionKey() == null || props.encryptionKey().isBlank() ? null : new TokenCipher(props.encryptionKey());
    }

    public List<PlatformInfo> platforms() {
        return ORDER.stream().map(p -> new PlatformInfo(p, NAMES.get(p), statsSupported(p), statsAvailable(p),
                "youtube".equals(p) && props.youtube().hasApiKey(), setupHint(p))).toList();
    }

    private static final java.time.Duration PUBLIC_CACHE = java.time.Duration.ofMinutes(15);
    private final java.util.concurrent.ConcurrentHashMap<String, PublicStats> publicCache = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Real public stats for a YouTube channel from its link: subscribers, views,
     * videos and the latest uploads. Needs only the server's API key, not the
     * owner's sign-in. Cached for 15 minutes per link to save API quota.
     */
    public Mono<PublicStats> publicStats(UUID userId, UUID id) {
        return find(userId, id).flatMap(c -> {
            if (!"youtube".equals(c.platform())) {
                return Mono.error(new BadRequestException("Public stats are available for YouTube channels"));
            }
            if (!props.youtube().hasApiKey()) {
                return Mono.error(new BadRequestException("Real YouTube stats need a YouTube Data API key on the server (YOUTUBE_API_KEY)."));
            }
            YouTubeChannelRef ref = YouTubeChannelRef.parse(c.url()).orElse(null);
            if (ref == null) {
                return Mono.error(new BadRequestException("Use your channel's @handle link, like https://www.youtube.com/@yourname"));
            }
            String cacheKey = ref.kind() + ":" + ref.value().toLowerCase(Locale.ROOT);
            PublicStats cached = publicCache.get(cacheKey);
            if (cached != null && cached.fetchedAt().isAfter(Instant.now().minus(PUBLIC_CACHE))) {
                return Mono.just(cached);
            }
            String param = switch (ref.kind()) {
                case HANDLE -> "forHandle";
                case ID -> "id";
                case USERNAME -> "forUsername";
            };
            String key = props.youtube().apiKey();
            return youtube.publicChannel(key, param, ref.value())
                    .switchIfEmpty(Mono.error(new NotFoundException("YouTube channel", ref.value())))
                    .flatMap(ch -> youtube.latestVideos(key, ch.uploadsPlaylistId(), 12)
                            .onErrorResume(e -> Mono.just(List.of()))
                            .map(videos -> new PublicStats(ch.id(), ch.title(), ch.handle(), ch.thumbnailUrl(), ch.subscribers(),
                                    ch.subscribersHidden(), ch.views(), ch.videos(), ch.publishedAt(), videos, Instant.now())))
                    .doOnNext(stats -> publicCache.put(cacheKey, stats))
                    .onErrorMap(org.springframework.web.reactive.function.client.WebClientResponseException.class, e -> {
                        log.warn("YouTube API error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
                        return new BadRequestException(e.getStatusCode().value() == 403
                                ? "YouTube refused the request: check that YOUTUBE_API_KEY is valid, has the YouTube Data API v3 enabled, and has quota left."
                                : "YouTube could not be reached (" + e.getStatusCode().value() + "). Try again shortly.");
                    });
        });
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
                return Mono.error(new BadRequestException(NAMES.get(c.platform()) + " stats are not set up on this server yet. " + setupHint(c.platform())));
            }
            String st = state.create(userId, c.platform(), c.id());
            return Mono.just(switch (c.platform()) {
                case "tiktok" -> tiktok.authorizeUrl(props.tiktok(), st);
                case "instagram" -> instagram.authorizeUrl(props.instagram(), st);
                default -> youtube.authorizeUrl(props.youtube(), st);
            });
        });
    }

    /** The platform redirects the browser here; we attach the tokens to the channel that asked. */
    public Mono<URI> callback(String platform, String code, String stateValue, String error) {
        if (error != null) {
            return Mono.just(frontend("error", "access_denied".equals(error) ? "You cancelled the connection." : error));
        }
        var payload = state.verify(stateValue, platform);
        if (payload.isEmpty() || code == null || !statsSupported(platform) || cipher == null) {
            return Mono.just(frontend("error", "The connection link expired or was not valid. Please try again."));
        }
        UUID userId = payload.get().userId();
        UUID channelId = payload.get().channelId();
        String label = NAMES.get(platform);
        return find(userId, channelId)
                .flatMap(c -> connect(platform, code).flatMap(conn -> repo.save(c.withConnection(conn.accountId(), conn.accountName(),
                        cipher.encrypt(conn.accessToken()), conn.refreshToken() == null ? null : cipher.encrypt(conn.refreshToken()),
                        expiry(conn.expiresInSeconds()), conn.scope()))))
                .map(saved -> frontend("connected", saved.id().toString()))
                .onErrorResume(e -> {
                    log.warn("{} connection failed: {}", label, e.getMessage());
                    String msg = e.getMessage() != null && e.getMessage().contains("channels_account_uq")
                            ? "That " + label + " account is already connected to another of your channels."
                            : label + " did not accept the connection: " + e.getMessage();
                    return Mono.just(frontend("error", msg));
                });
    }

    private record Connection(String accountId, String accountName, String accessToken, String refreshToken, long expiresInSeconds, String scope) {
    }

    /** Exchanges the code and reads who the account is, per platform. */
    private Mono<Connection> connect(String platform, String code) {
        return switch (platform) {
            case "tiktok" -> tiktok.exchangeCode(props.tiktok(), code).flatMap(t -> tiktok.profile(t.accessToken())
                    .map(p -> new Connection(p.accountId() != null ? p.accountId() : t.accountId(), p.handle() != null ? p.handle() : p.name(),
                            t.accessToken(), t.refreshToken(), t.expiresInSeconds(), t.scope())));
            case "instagram" -> instagram.exchangeCode(props.instagram(), code).flatMap(t -> instagram.profile(t.accessToken())
                    .map(p -> new Connection(p.accountId() != null ? p.accountId() : t.accountId(), p.handle() != null ? p.handle() : p.name(),
                            t.accessToken(), null, t.expiresInSeconds(), t.scope())));
            default -> youtube.exchangeCode(props.youtube(), code).flatMap(t -> youtube.myChannel(t.accessToken())
                    .map(ch -> new Connection(ch.id(), ch.title(), t.accessToken(), t.refreshToken(), t.expiresInSeconds(), t.scope())));
        };
    }

    private static final java.time.Duration SOCIAL_CACHE = java.time.Duration.ofMinutes(10);
    private final java.util.concurrent.ConcurrentHashMap<UUID, SocialStats> socialCache = new java.util.concurrent.ConcurrentHashMap<>();

    /** Live TikTok or Instagram numbers for a connected account. Cached for 10 minutes. */
    public Mono<SocialStats> socialStats(UUID userId, UUID id) {
        return find(userId, id)
                .flatMap(c -> c.connected() && ("tiktok".equals(c.platform()) || "instagram".equals(c.platform()))
                        ? Mono.just(c)
                        : Mono.<Channel>error(new BadRequestException("Connect this TikTok or Instagram account first")))
                .flatMap(c -> {
                    SocialStats cached = socialCache.get(c.id());
                    if (cached != null && cached.fetchedAt().isAfter(Instant.now().minus(SOCIAL_CACHE))) {
                        return Mono.just(cached);
                    }
                    return freshToken(c).flatMap(tc -> {
                        boolean tt = "tiktok".equals(c.platform());
                        Mono<com.teguwaz.connection.SocialProfile> profile = tt ? tiktok.profile(tc.token()) : instagram.profile(tc.token());
                        Mono<List<com.teguwaz.connection.SocialPost>> posts = (tt ? tiktok.recentVideos(tc.token(), 20) : instagram.recentPosts(tc.token(), 20))
                                .onErrorResume(e -> {
                                    log.info("{} posts unavailable: {}", c.platform(), e.getMessage());
                                    return Mono.just(List.of());
                                });
                        return profile.zipWith(posts)
                                .flatMap(t -> repo.save(tc.channel().synced()).thenReturn(toSocialStats(c.platform(), t.getT1(), t.getT2())));
                    }).doOnNext(stats -> socialCache.put(c.id(), stats));
                })
                .onErrorMap(org.springframework.web.reactive.function.client.WebClientResponseException.class, e -> {
                    log.warn("Social API error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
                    return new BadRequestException(e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403
                            ? "Access was refused. The account may have removed Teguwaz's permission: connect again."
                            : "The platform could not be reached (" + e.getStatusCode().value() + "). Try again shortly.");
                });
    }

    public static SocialStats toSocialStats(String platform, com.teguwaz.connection.SocialProfile p, List<com.teguwaz.connection.SocialPost> posts) {
        boolean hasViews = posts.stream().anyMatch(x -> x.views() != null);
        boolean hasShares = posts.stream().anyMatch(x -> x.shares() != null);
        long views = posts.stream().mapToLong(x -> x.views() == null ? 0 : x.views()).sum();
        long likes = posts.stream().mapToLong(x -> x.likes() == null ? 0 : x.likes()).sum();
        long comments = posts.stream().mapToLong(x -> x.comments() == null ? 0 : x.comments()).sum();
        long shares = posts.stream().mapToLong(x -> x.shares() == null ? 0 : x.shares()).sum();
        Double engagement;
        String note = null;
        if (hasViews && views > 0) {
            engagement = Math.round((likes + comments + shares) * 1000.0 / views) / 10.0;
        } else if (p.followers() != null && p.followers() > 0 && !posts.isEmpty()) {
            // Instagram does not give views without insights: use interactions per post per follower.
            engagement = Math.round((likes + comments) * 1000.0 / posts.size() / p.followers()) / 10.0;
            note = "Engagement here is likes and comments per post, as a share of followers.";
        } else {
            engagement = null;
        }
        return new SocialStats(platform, p.name(), p.handle(), p.avatarUrl(), p.profileUrl(), p.followers(), p.following(),
                p.totalLikes(), p.posts(), posts.size(), hasViews ? views : null, likes, comments, hasShares ? shares : null,
                engagement, posts, Instant.now(), note);
    }

    public Mono<ChannelResponse> disconnect(UUID userId, UUID id) {
        return find(userId, id).flatMap(c -> revokeQuietly(c).then(repo.save(c.disconnected()))).map(this::toResponse);
    }

    public Mono<YouTubeStats> stats(UUID userId, UUID id) {
        return find(userId, id)
                .flatMap(c -> c.connected() && "youtube".equals(c.platform())
                        ? Mono.just(c)
                        : Mono.<Channel>error(new BadRequestException("Connect this YouTube channel's stats first")))
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
        return "youtube".equals(platform) || "tiktok".equals(platform) || "instagram".equals(platform);
    }

    private boolean statsAvailable(String platform) {
        if (!statsSupported(platform) || cipher == null) {
            return false;
        }
        return switch (platform) {
            case "tiktok" -> props.tiktok().configured();
            case "instagram" -> props.instagram().configured();
            default -> props.youtube().configured();
        };
    }

    static String setupHint(String platform) {
        return switch (platform) {
            case "youtube" -> "Create an OAuth client (Web application) in Google Cloud, enable the YouTube Data API v3 and "
                    + "YouTube Analytics API, then set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY on the backend.";
            case "instagram" -> "Create a Meta app with \"Instagram API with Instagram login\", add the redirect URI, then set INSTAGRAM_APP_ID, "
                    + "INSTAGRAM_APP_SECRET and TOKEN_ENCRYPTION_KEY. Works for Instagram Business and Creator accounts; other people need Meta's app review.";
            case "tiktok" -> "Create a TikTok for Developers app with Login Kit and the Display API, add the redirect URI, then set TIKTOK_CLIENT_KEY, "
                    + "TIKTOK_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY. Until TikTok approves the app, only accounts added as test users can connect.";
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
        String label = NAMES.get(c.platform());
        // Instagram's 60-day token is refreshed with itself, a week before it runs out.
        long margin = "instagram".equals(c.platform()) ? 7 * 86400 : 60;
        if (c.tokenExpiresAt() != null && c.tokenExpiresAt().isAfter(Instant.now().plusSeconds(margin))) {
            return Mono.just(new TokenAndChannel(cipher.decrypt(c.accessToken()), c));
        }
        if ("instagram".equals(c.platform())) {
            if (c.tokenExpiresAt() != null && c.tokenExpiresAt().isBefore(Instant.now())) {
                return Mono.error(new BadRequestException("Instagram access expired. Please connect again."));
            }
            return instagram.refresh(cipher.decrypt(c.accessToken()))
                    .flatMap(t -> repo.save(c.withTokens(cipher.encrypt(t.accessToken()), null, expiry(t.expiresInSeconds())))
                            .map(saved -> new TokenAndChannel(t.accessToken(), saved)))
                    .onErrorResume(e -> Mono.just(new TokenAndChannel(cipher.decrypt(c.accessToken()), c)));
        }
        if (c.refreshToken() == null) {
            return Mono.error(new BadRequestException(label + " access expired. Please connect again."));
        }
        String refresh = cipher.decrypt(c.refreshToken());
        if ("tiktok".equals(c.platform())) {
            return tiktok.refresh(props.tiktok(), refresh)
                    .flatMap(t -> repo.save(c.withTokens(cipher.encrypt(t.accessToken()),
                                    cipher.encrypt(t.refreshToken() != null ? t.refreshToken() : refresh), expiry(t.expiresInSeconds())))
                            .map(saved -> new TokenAndChannel(t.accessToken(), saved)));
        }
        return youtube.refresh(props.youtube(), refresh)
                .flatMap(t -> repo.save(c.withTokens(cipher.encrypt(t.accessToken()), cipher.encrypt(t.refreshToken()), expiry(t.expiresInSeconds())))
                        .map(saved -> new TokenAndChannel(t.accessToken(), saved)));
    }

    private Mono<Void> revokeQuietly(Channel c) {
        socialCache.remove(c.id());
        if (!c.connected() || cipher == null || "instagram".equals(c.platform())) {
            return Mono.empty(); // Instagram has no revoke call; the stored token is deleted
        }
        if ("tiktok".equals(c.platform())) {
            return tiktok.revoke(props.tiktok(), cipher.decrypt(c.accessToken())).onErrorResume(e -> Mono.empty());
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
