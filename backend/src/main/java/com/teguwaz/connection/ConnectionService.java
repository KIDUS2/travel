package com.teguwaz.connection;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.connection.ConnectionDtos.ConnectionStatus;
import com.teguwaz.connection.ConnectionDtos.YouTubeStats;
import com.teguwaz.connection.YouTubeClient.Day;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ConnectionService {

    private static final Logger log = LoggerFactory.getLogger(ConnectionService.class);
    static final List<String> PLATFORMS = List.of("youtube", "instagram", "tiktok");
    private static final int REPORT_DAYS = 28;

    private final SocialConnectionRepository repo;
    private final PlatformProperties props;
    private final YouTubeClient youtube;
    private final OAuthState state;
    private final TokenCipher cipher;

    public ConnectionService(SocialConnectionRepository repo, PlatformProperties props, YouTubeClient youtube) {
        this.repo = repo;
        this.props = props;
        this.youtube = youtube;
        this.state = new OAuthState(props.stateKey(), Clock.systemUTC());
        this.cipher = props.encryptionKey() == null || props.encryptionKey().isBlank() ? null : new TokenCipher(props.encryptionKey());
    }

    public Flux<ConnectionStatus> list(UUID userId) {
        return repo.findByUserId(userId)
                .collectMap(SocialConnection::platform, Function.identity())
                .flatMapMany(byPlatform -> Flux.fromIterable(PLATFORMS).map(p -> status(p, byPlatform)));
    }

    private ConnectionStatus status(String platform, Map<String, SocialConnection> connected) {
        SocialConnection c = connected.get(platform);
        boolean available = "youtube".equals(platform) && props.youtube().configured() && cipher != null;
        return new ConnectionStatus(platform, available, c != null, c != null ? c.accountName() : null,
                c != null ? c.connectedAt() : null, c != null ? c.lastSyncedAt() : null, setupHint(platform));
    }

    static String setupHint(String platform) {
        return switch (platform) {
            case "youtube" -> "Create an OAuth client (Web application) in Google Cloud, enable the YouTube Data API v3 and "
                    + "YouTube Analytics API, then set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY on the backend.";
            case "instagram" -> "Coming next. Needs a Meta app with Instagram API access (Business or Creator accounts) and Meta's app review.";
            case "tiktok" -> "Coming next. Needs a TikTok for Developers app approved for the Display API.";
            default -> "";
        };
    }

    public Mono<String> start(UUID userId, String platform) {
        if (!"youtube".equals(platform)) {
            return Mono.error(new BadRequestException(setupHint(platform)));
        }
        if (!props.youtube().configured() || cipher == null) {
            return Mono.error(new BadRequestException("YouTube is not set up on this server yet. " + setupHint("youtube")));
        }
        return Mono.just(youtube.authorizeUrl(props.youtube(), state.create(userId, platform)));
    }

    /** Google redirects the browser here; we finish the connection and send the user back to the app. */
    public Mono<URI> callback(String platform, String code, String stateValue, String error) {
        URI back = frontend("/creator", "connected", platform);
        if (error != null) {
            return Mono.just(frontend("/creator", "error", "access_denied".equals(error) ? "You cancelled the connection." : error));
        }
        var payload = state.verify(stateValue, platform);
        if (payload.isEmpty() || code == null || !"youtube".equals(platform) || cipher == null) {
            return Mono.just(frontend("/creator", "error", "The connection link expired or was not valid. Please try again."));
        }
        UUID userId = payload.get().userId();
        return youtube.exchangeCode(props.youtube(), code)
                .flatMap(tokens -> youtube.myChannel(tokens.accessToken()).flatMap(ch ->
                        repo.findByUserIdAndPlatform(userId, platform)
                                .map(existing -> existing.withTokens(cipher.encrypt(tokens.accessToken()),
                                        cipher.encrypt(tokens.refreshToken()), expiry(tokens.expiresInSeconds())))
                                .defaultIfEmpty(new SocialConnection(null, userId, platform, ch.id(), ch.title(),
                                        cipher.encrypt(tokens.accessToken()), cipher.encrypt(tokens.refreshToken()),
                                        expiry(tokens.expiresInSeconds()), tokens.scope(), Instant.now(), null))
                                .flatMap(repo::save)))
                .thenReturn(back)
                .onErrorResume(e -> {
                    log.warn("YouTube connection failed: {}", e.getMessage());
                    return Mono.just(frontend("/creator", "error", "YouTube did not accept the connection: " + e.getMessage()));
                });
    }

    public Mono<YouTubeStats> youtubeStats(UUID userId) {
        return repo.findByUserIdAndPlatform(userId, "youtube")
                .switchIfEmpty(Mono.error(new NotFoundException("Connection", "youtube")))
                .flatMap(this::freshAccessToken)
                .flatMap(pair -> {
                    String token = pair.token();
                    LocalDate end = LocalDate.now(ZoneOffset.UTC).minusDays(1);
                    LocalDate start = end.minusDays(REPORT_DAYS - 1);
                    Mono<List<Day>> days = youtube.dailyReport(token, start, end)
                            .onErrorResume(e -> {
                                log.info("YouTube Analytics unavailable: {}", e.getMessage());
                                return Mono.just(List.of());
                            });
                    return youtube.myChannel(token).zipWith(days)
                            .flatMap(t -> repo.save(pair.connection().synced()).thenReturn(toStats(t.getT1(), t.getT2())));
                });
    }

    public Mono<Void> disconnect(UUID userId, String platform) {
        return repo.findByUserIdAndPlatform(userId, platform)
                .switchIfEmpty(Mono.error(new NotFoundException("Connection", platform)))
                .flatMap(c -> {
                    Mono<Void> revoke = cipher == null || !"youtube".equals(platform) ? Mono.empty()
                            : youtube.revoke(cipher.decrypt(c.refreshToken() != null ? c.refreshToken() : c.accessToken()))
                                    .onErrorResume(e -> Mono.empty());
                    return revoke.then(repo.delete(c));
                });
    }

    private record TokenAndConnection(String token, SocialConnection connection) {
    }

    private Mono<TokenAndConnection> freshAccessToken(SocialConnection c) {
        if (cipher == null) {
            return Mono.error(new BadRequestException("TOKEN_ENCRYPTION_KEY is not set on the server"));
        }
        boolean valid = c.tokenExpiresAt() != null && c.tokenExpiresAt().isAfter(Instant.now().plusSeconds(60));
        if (valid) {
            return Mono.just(new TokenAndConnection(cipher.decrypt(c.accessToken()), c));
        }
        if (c.refreshToken() == null) {
            return Mono.error(new BadRequestException("YouTube access expired. Please connect again."));
        }
        return youtube.refresh(props.youtube(), cipher.decrypt(c.refreshToken()))
                .flatMap(t -> repo.save(c.withTokens(cipher.encrypt(t.accessToken()), cipher.encrypt(t.refreshToken()), expiry(t.expiresInSeconds())))
                        .map(saved -> new TokenAndConnection(t.accessToken(), saved)));
    }

    static YouTubeStats toStats(YouTubeClient.Channel ch, List<Day> days) {
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

    private static Instant expiry(long seconds) {
        return Instant.now().plusSeconds(Math.max(60, seconds));
    }

    private URI frontend(String path, String key, String value) {
        return UriComponentsBuilder.fromUriString(props.frontendUrl()).path(path).queryParam(key, value).encode().build().toUri();
    }
}
