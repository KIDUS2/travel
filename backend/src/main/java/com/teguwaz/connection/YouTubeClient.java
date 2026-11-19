package com.teguwaz.connection;

import java.time.LocalDate;
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
 * Google OAuth 2.0 and the YouTube Data / Analytics APIs.
 * Read-only scopes: channel statistics and daily analytics.
 */
@Component
public class YouTubeClient {

    static final String SCOPES = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly";

    public record Tokens(String accessToken, String refreshToken, long expiresInSeconds, String scope) {
    }

    public record Channel(String id, String title, long views, long subscribers, long videos) {
    }

    public record Day(LocalDate date, long views, long likes, long comments, long shares, long subscribersGained) {
    }

    private final WebClient http;

    public YouTubeClient(WebClient.Builder builder) {
        this.http = builder.build();
    }

    public String authorizeUrl(PlatformProperties.App app, String state) {
        return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", app.clientId())
                .queryParam("redirect_uri", app.redirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", SCOPES)
                .queryParam("access_type", "offline")
                .queryParam("include_granted_scopes", "true")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .encode()
                .toUriString();
    }

    public Mono<Tokens> exchangeCode(PlatformProperties.App app, String code) {
        return tokenRequest(BodyInserters.fromFormData("code", code)
                .with("client_id", app.clientId())
                .with("client_secret", app.clientSecret())
                .with("redirect_uri", app.redirectUri())
                .with("grant_type", "authorization_code"));
    }

    public Mono<Tokens> refresh(PlatformProperties.App app, String refreshToken) {
        return tokenRequest(BodyInserters.fromFormData("refresh_token", refreshToken)
                .with("client_id", app.clientId())
                .with("client_secret", app.clientSecret())
                .with("grant_type", "refresh_token"));
    }

    private Mono<Tokens> tokenRequest(BodyInserters.FormInserter<String> form) {
        return http.post().uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(j -> new Tokens(j.path("access_token").asText(), textOrNull(j, "refresh_token"),
                        j.path("expires_in").asLong(3600), textOrNull(j, "scope")));
    }

    public Mono<Channel> myChannel(String accessToken) {
        return http.get().uri("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true")
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(j -> {
                    JsonNode item = j.path("items").path(0);
                    if (item.isMissingNode()) {
                        return Mono.error(new IllegalStateException("This Google account has no YouTube channel"));
                    }
                    JsonNode s = item.path("statistics");
                    return Mono.just(new Channel(item.path("id").asText(), item.path("snippet").path("title").asText(),
                            s.path("viewCount").asLong(), s.path("subscriberCount").asLong(), s.path("videoCount").asLong()));
                });
    }

    public Mono<List<Day>> dailyReport(String accessToken, LocalDate start, LocalDate end) {
        String uri = UriComponentsBuilder.fromUriString("https://youtubeanalytics.googleapis.com/v2/reports")
                .queryParam("ids", "channel==MINE")
                .queryParam("startDate", start)
                .queryParam("endDate", end)
                .queryParam("metrics", "views,likes,comments,shares,subscribersGained")
                .queryParam("dimensions", "day")
                .queryParam("sort", "day")
                .encode()
                .toUriString();
        return http.get().uri(uri)
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(j -> {
                    List<Day> days = new ArrayList<>();
                    for (JsonNode row : j.path("rows")) {
                        days.add(new Day(LocalDate.parse(row.path(0).asText()), row.path(1).asLong(), row.path(2).asLong(),
                                row.path(3).asLong(), row.path(4).asLong(), row.path(5).asLong()));
                    }
                    return days;
                });
    }

    public Mono<Void> revoke(String token) {
        return http.post().uri("https://oauth2.googleapis.com/revoke")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("token", token))
                .retrieve()
                .toBodilessEntity()
                .then();
    }

    private static String textOrNull(JsonNode j, String field) {
        JsonNode n = j.path(field);
        return n.isMissingNode() || n.isNull() || n.asText().isEmpty() ? null : n.asText();
    }
}
