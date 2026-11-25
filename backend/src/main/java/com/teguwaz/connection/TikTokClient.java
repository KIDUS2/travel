package com.teguwaz.connection;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;

import reactor.core.publisher.Mono;

/**
 * TikTok Login Kit (OAuth 2.0 v2) and Display API: profile counts and recent videos.
 * Read-only scopes. Access tokens last a day; refresh tokens a year.
 */
@Component
public class TikTokClient {

    static final String SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list";
    private static final String API = "https://open.tiktokapis.com/v2";
    private static final String USER_FIELDS = "open_id,display_name,username,avatar_url,profile_deep_link,follower_count,following_count,likes_count,video_count";
    private static final String VIDEO_FIELDS = "id,title,video_description,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count";

    private final WebClient http;

    public TikTokClient(WebClient.Builder builder) {
        this.http = builder.build();
    }

    public String authorizeUrl(PlatformProperties.App app, String state) {
        return UriComponentsBuilder.fromUriString("https://www.tiktok.com/v2/auth/authorize/")
                .queryParam("client_key", app.clientId())
                .queryParam("scope", SCOPES)
                .queryParam("response_type", "code")
                .queryParam("redirect_uri", app.redirectUri())
                .queryParam("state", state)
                .encode().toUriString();
    }

    public Mono<OAuthTokens> exchangeCode(PlatformProperties.App app, String code) {
        return token(BodyInserters.fromFormData("client_key", app.clientId()).with("client_secret", app.clientSecret())
                .with("code", code).with("grant_type", "authorization_code").with("redirect_uri", app.redirectUri()));
    }

    public Mono<OAuthTokens> refresh(PlatformProperties.App app, String refreshToken) {
        return token(BodyInserters.fromFormData("client_key", app.clientId()).with("client_secret", app.clientSecret())
                .with("grant_type", "refresh_token").with("refresh_token", refreshToken));
    }

    private Mono<OAuthTokens> token(BodyInserters.FormInserter<String> form) {
        return http.post().uri(API + "/oauth/token/")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve().bodyToMono(JsonNode.class)
                .flatMap(n -> n.hasNonNull("access_token")
                        ? Mono.just(new OAuthTokens(n.path("access_token").asText(), n.path("refresh_token").asText(null),
                                n.path("expires_in").asLong(86400), n.path("scope").asText(null), n.path("open_id").asText(null)))
                        : Mono.error(new IllegalStateException(n.path("error_description").asText(n.path("error").asText("TikTok did not return a token")))));
    }

    public Mono<Void> revoke(PlatformProperties.App app, String token) {
        return http.post().uri(API + "/oauth/revoke/")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("client_key", app.clientId()).with("client_secret", app.clientSecret()).with("token", token))
                .retrieve().toBodilessEntity().then();
    }

    public Mono<SocialProfile> profile(String accessToken) {
        return http.get().uri(API + "/user/info/?fields={f}", USER_FIELDS)
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve().bodyToMono(JsonNode.class)
                .map(TikTokClient::parseProfile);
    }

    public Mono<List<SocialPost>> recentVideos(String accessToken, int max) {
        return http.post().uri(API + "/video/list/?fields={f}", VIDEO_FIELDS)
                .headers(h -> h.setBearerAuth(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(java.util.Map.of("max_count", Math.min(max, 20)))
                .retrieve().bodyToMono(JsonNode.class)
                .map(TikTokClient::parseVideos);
    }

    static SocialProfile parseProfile(JsonNode n) {
        JsonNode u = n.path("data").path("user");
        String username = u.path("username").asText(null);
        return new SocialProfile(u.path("open_id").asText(null), u.path("display_name").asText(username),
                username == null ? null : "@" + username, u.path("avatar_url").asText(null), u.path("profile_deep_link").asText(null),
                num(u, "follower_count"), num(u, "following_count"), num(u, "likes_count"), num(u, "video_count"));
    }

    static List<SocialPost> parseVideos(JsonNode n) {
        List<SocialPost> out = new ArrayList<>();
        for (JsonNode v : n.path("data").path("videos")) {
            String title = v.path("title").asText("");
            if (title.isBlank()) {
                title = v.path("video_description").asText("TikTok video");
            }
            String published = v.hasNonNull("create_time") ? Instant.ofEpochSecond(v.path("create_time").asLong()).toString() : null;
            out.add(new SocialPost(v.path("id").asText(), title.length() > 120 ? title.substring(0, 117) + "…" : title,
                    v.path("share_url").asText(null), v.path("cover_image_url").asText(null), published,
                    num(v, "view_count"), num(v, "like_count"), num(v, "comment_count"), num(v, "share_count")));
        }
        return out;
    }

    static Long num(JsonNode n, String field) {
        return n.hasNonNull(field) ? n.path(field).asLong() : null;
    }
}
