package com.teguwaz.connection;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * OAuth apps for each platform, and the keys used to protect tokens.
 * A platform is "available" once its client id and secret are set.
 */
@ConfigurationProperties(prefix = "teguwaz.platforms")
public record PlatformProperties(
        String frontendUrl,
        String encryptionKey,
        String stateKey,
        App youtube,
        App instagram,
        App tiktok) {

    /** {@code apiKey} (YouTube only) reads public channel stats without the owner signing in. */
    public record App(String clientId, String clientSecret, String redirectUri, String apiKey) {
        public boolean configured() {
            return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
        }

        public boolean hasApiKey() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    public PlatformProperties {
        if (frontendUrl == null || frontendUrl.isBlank()) {
            frontendUrl = "http://localhost:5173";
        }
        youtube = youtube == null ? new App(null, null, null, null) : youtube;
        instagram = instagram == null ? new App(null, null, null, null) : instagram;
        tiktok = tiktok == null ? new App(null, null, null, null) : tiktok;
    }

    public App app(String platform) {
        return switch (platform) {
            case "youtube" -> youtube;
            case "instagram" -> instagram;
            case "tiktok" -> tiktok;
            default -> new App(null, null, null, null);
        };
    }
}
