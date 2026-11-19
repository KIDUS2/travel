package com.teguwaz.connection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class ConnectionSecurityTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void tokensRoundTripAndAreNotStoredInPlainText() {
        TokenCipher c = new TokenCipher(KEY);
        String stored = c.encrypt("ya29.secret-token");
        assertThat(stored).doesNotContain("secret");
        assertThat(c.decrypt(stored)).isEqualTo("ya29.secret-token");
        assertThat(c.encrypt("same")).isNotEqualTo(c.encrypt("same"));
    }

    @Test
    void tamperedTokenIsRejected() {
        TokenCipher c = new TokenCipher(KEY);
        byte[] raw = Base64.getDecoder().decode(c.encrypt("token"));
        raw[raw.length - 1] ^= 1;
        assertThatThrownBy(() -> c.decrypt(Base64.getEncoder().encodeToString(raw))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void cipherNeedsA32ByteKey() {
        assertThatThrownBy(() -> new TokenCipher(null)).hasMessageContaining("openssl rand -base64 32");
        assertThatThrownBy(() -> new TokenCipher(Base64.getEncoder().encodeToString(new byte[16]))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void stateIdentifiesTheUserAndPlatform() {
        OAuthState s = new OAuthState("k", Clock.systemUTC());
        UUID user = UUID.randomUUID();
        String value = s.create(user, "youtube");
        assertThat(s.verify(value, "youtube")).hasValueSatisfying(p -> assertThat(p.userId()).isEqualTo(user));
        assertThat(s.verify(value, "tiktok")).isEmpty();
    }

    @Test
    void forgedOrExpiredStateIsRejected() {
        UUID user = UUID.randomUUID();
        OAuthState s = new OAuthState("k", Clock.systemUTC());
        String value = s.create(user, "youtube");
        String forged = value.replace(user.toString(), UUID.randomUUID().toString());
        assertThat(s.verify(forged, "youtube")).isEmpty();
        assertThat(new OAuthState("other-key", Clock.systemUTC()).verify(value, "youtube")).isEmpty();

        OAuthState past = new OAuthState("k", Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC));
        assertThat(s.verify(past.create(user, "youtube"), "youtube")).isEmpty();
    }

    @Test
    void statsSumTheDailyReport() {
        var ch = new YouTubeClient.Channel("UC1", "Meron Travels", 1000, 50, 12);
        var days = List.of(
                new YouTubeClient.Day(LocalDate.of(2026, 11, 1), 100, 8, 2, 0, 1),
                new YouTubeClient.Day(LocalDate.of(2026, 11, 2), 300, 20, 5, 5, 3));
        var stats = ConnectionService.toStats(ch, days);
        assertThat(stats.periodViews()).isEqualTo(400);
        assertThat(stats.subscribersGained()).isEqualTo(4);
        assertThat(stats.engagementRate()).isEqualTo(10.0);
        assertThat(stats.analyticsAvailable()).isTrue();
        assertThat(ConnectionService.toStats(ch, List.of()).analyticsAvailable()).isFalse();
    }
}
