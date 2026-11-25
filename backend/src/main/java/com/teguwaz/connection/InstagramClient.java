package com.teguwaz.connection;

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
 * Instagram API with Instagram Login (Business and Creator accounts): profile counts and recent posts.
 * The short-lived login token is swapped for a 60-day token, which is refreshed with itself.
 */
@Component
public class InstagramClient {

    static final String SCOPES = "instagram_business_basic,instagram_business_manage_insights";
    private static final String GRAPH = "https://graph.instagram.com";

    private final WebClient http;

    public InstagramClient(WebClient.Builder builder) {
        this.http = builder.build();
    }

    public String authorizeUrl(PlatformProperties.App app, String state) {
        return UriComponentsBuilder.fromUriString("https://www.instagram.com/oauth/authorize")
                .queryParam("client_id", app.clientId())
                .queryParam("redirect_uri", app.redirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPES)
                .queryParam("state", state)
                .encode().toUriString();
    }

    /** Code → short-lived token → long-lived (60 day) token. */
    public Mono<OAuthTokens> exchangeCode(PlatformProperties.App app, String code) {
        return http.post().uri("https://api.instagram.com/oauth/access_token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("client_id", app.clientId()).with("client_secret", app.clientSecret())
                        .with("grant_type", "authorization_code").with("redirect_uri", app.redirectUri()).with("code", code))
                .retrieve().bodyToMono(JsonNode.class)
                .flatMap(n -> {
                    // Newer responses wrap the result in "data": [ ... ].
                    JsonNode t = n.has("data") && n.path("data").isArray() ? n.path("data").path(0) : n;
                    String shortToken = t.path("access_token").asText(null);
                    if (shortToken == null) {
                        return Mono.error(new IllegalStateException(n.path("error_message").asText("Instagram did not return a token")));
                    }
                    String userId = t.path("user_id").asText(null);
                    String scope = t.path("permissions").isArray() ? join(t.path("permissions")) : t.path("permissions").asText(null);
                    return http.get().uri(GRAPH + "/access_token?grant_type=ig_exchange_token&client_secret={s}&access_token={t}",
                                    app.clientSecret(), shortToken)
                            .retrieve().bodyToMono(JsonNode.class)
                            .map(l -> new OAuthTokens(l.path("access_token").asText(), null, l.path("expires_in").asLong(5_184_000), scope, userId));
                });
    }

    public Mono<OAuthTokens> refresh(String longLivedToken) {
        return http.get().uri(GRAPH + "/refresh_access_token?grant_type=ig_refresh_token&access_token={t}", longLivedToken)
                .retrieve().bodyToMono(JsonNode.class)
                .map(l -> new OAuthTokens(l.path("access_token").asText(), null, l.path("expires_in").asLong(5_184_000), null, null));
    }

    public Mono<SocialProfile> profile(String accessToken) {
        return http.get().uri(GRAPH + "/me?fields=user_id,username,name,profile_picture_url,followers_count,follows_count,media_count&access_token={t}", accessToken)
                .retrieve().bodyToMono(JsonNode.class)
                .map(InstagramClient::parseProfile);
    }

    public Mono<List<SocialPost>> recentPosts(String accessToken, int max) {
        return http.get().uri(GRAPH + "/me/media?fields=id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit={n}&access_token={t}",
                        Math.min(max, 25), accessToken)
                .retrieve().bodyToMono(JsonNode.class)
                .map(InstagramClient::parsePosts);
    }

    static SocialProfile parseProfile(JsonNode u) {
        String username = u.path("username").asText(null);
        return new SocialProfile(u.path("user_id").asText(u.path("id").asText(null)), u.path("name").asText(username),
                username == null ? null : "@" + username, u.path("profile_picture_url").asText(null),
                username == null ? null : "https://www.instagram.com/" + username + "/",
                TikTokClient.num(u, "followers_count"), TikTokClient.num(u, "follows_count"), null, TikTokClient.num(u, "media_count"));
    }

    static List<SocialPost> parsePosts(JsonNode n) {
        List<SocialPost> out = new ArrayList<>();
        for (JsonNode p : n.path("data")) {
            String caption = p.path("caption").asText("");
            String title = caption.isBlank() ? ("VIDEO".equals(p.path("media_type").asText()) ? "Reel" : "Post") : caption.split("\\n")[0];
            String thumb = p.hasNonNull("thumbnail_url") ? p.path("thumbnail_url").asText() : p.path("media_url").asText(null);
            out.add(new SocialPost(p.path("id").asText(), title.length() > 120 ? title.substring(0, 117) + "…" : title,
                    p.path("permalink").asText(null), thumb, p.path("timestamp").asText(null),
                    null, TikTokClient.num(p, "like_count"), TikTokClient.num(p, "comments_count"), null));
        }
        return out;
    }

    private static String join(JsonNode arr) {
        List<String> parts = new ArrayList<>();
        arr.forEach(x -> parts.add(x.asText()));
        return String.join(",", parts);
    }
}
