package com.teguwaz.connection;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

/** A connected account. Tokens here are encrypted (see {@link TokenCipher}). */
@Table("social_connections")
public record SocialConnection(
        @Id UUID id,
        UUID userId,
        String platform,
        String accountId,
        String accountName,
        String accessToken,
        String refreshToken,
        Instant tokenExpiresAt,
        String scopes,
        Instant connectedAt,
        Instant lastSyncedAt) {

    public SocialConnection withTokens(String accessToken, String refreshToken, Instant expiresAt) {
        return new SocialConnection(id, userId, platform, accountId, accountName, accessToken,
                refreshToken != null ? refreshToken : this.refreshToken, expiresAt, scopes, connectedAt, lastSyncedAt);
    }

    public SocialConnection synced() {
        return new SocialConnection(id, userId, platform, accountId, accountName, accessToken, refreshToken,
                tokenExpiresAt, scopes, connectedAt, Instant.now());
    }
}
