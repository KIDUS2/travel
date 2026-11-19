package com.teguwaz.channel;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/**
 * One of the user's channels: a name and a link they gave us, on any platform.
 * Optionally connected for stats (tokens encrypted with TokenCipher).
 */
@Table("channels")
public record Channel(
        @Id UUID id,
        UUID userId,
        String platform,
        String name,
        String url,
        String accountId,
        String accountName,
        String accessToken,
        String refreshToken,
        Instant tokenExpiresAt,
        String scopes,
        Instant connectedAt,
        Instant lastSyncedAt,
        Instant createdAt,
        Instant updatedAt) {

    public static Channel create(UUID userId, String platform, String name, String url) {
        Instant now = Instant.now();
        return new Channel(null, userId, platform, name, url, null, null, null, null, null, null, null, null, now, now);
    }

    public boolean connected() {
        return accessToken != null;
    }

    public Channel withDetails(String platform, String name, String url) {
        return new Channel(id, userId, platform, name, url, accountId, accountName, accessToken, refreshToken,
                tokenExpiresAt, scopes, connectedAt, lastSyncedAt, createdAt, Instant.now());
    }

    public Channel withConnection(String accountId, String accountName, String accessToken, String refreshToken,
                                  Instant expiresAt, String scopes) {
        return new Channel(id, userId, platform, name, url, accountId, accountName, accessToken,
                refreshToken != null ? refreshToken : this.refreshToken, expiresAt, scopes,
                connectedAt != null ? connectedAt : Instant.now(), lastSyncedAt, createdAt, Instant.now());
    }

    public Channel withTokens(String accessToken, String refreshToken, Instant expiresAt) {
        return new Channel(id, userId, platform, name, url, accountId, accountName, accessToken,
                refreshToken != null ? refreshToken : this.refreshToken, expiresAt, scopes, connectedAt, lastSyncedAt, createdAt, updatedAt);
    }

    public Channel disconnected() {
        return new Channel(id, userId, platform, name, url, null, null, null, null, null, null, null, null, createdAt, Instant.now());
    }

    public Channel synced() {
        return new Channel(id, userId, platform, name, url, accountId, accountName, accessToken, refreshToken,
                tokenExpiresAt, scopes, connectedAt, Instant.now(), createdAt, updatedAt);
    }
}
