package com.teguwaz.connection;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * The OAuth "state" value: who started the connection, for which platform,
 * until when. Signed with HMAC so the callback can trust it (blocks CSRF and
 * someone else's account being attached to your profile).
 */
public class OAuthState {

    public record Payload(UUID userId, String platform) {
    }

    private static final long TTL_SECONDS = 600;
    private final byte[] key;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public OAuthState(String configuredKey, Clock clock) {
        this.clock = clock;
        if (configuredKey == null || configuredKey.isBlank()) {
            byte[] k = new byte[32];
            new SecureRandom().nextBytes(k);
            this.key = k;
        } else {
            this.key = configuredKey.getBytes(StandardCharsets.UTF_8);
        }
    }

    public String create(UUID userId, String platform) {
        byte[] nonce = new byte[12];
        random.nextBytes(nonce);
        long exp = clock.instant().getEpochSecond() + TTL_SECONDS;
        String body = userId + "." + platform + "." + exp + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(nonce);
        return body + "." + sign(body);
    }

    public Optional<Payload> verify(String state, String expectedPlatform) {
        if (state == null) {
            return Optional.empty();
        }
        int dot = state.lastIndexOf('.');
        if (dot < 0) {
            return Optional.empty();
        }
        String body = state.substring(0, dot);
        String sig = state.substring(dot + 1);
        if (!MessageDigest.isEqual(sign(body).getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8))) {
            return Optional.empty();
        }
        String[] parts = body.split("\\.");
        if (parts.length != 4 || !parts[1].equals(expectedPlatform)) {
            return Optional.empty();
        }
        try {
            if (Long.parseLong(parts[2]) < clock.instant().getEpochSecond()) {
                return Optional.empty();
            }
            return Optional.of(new Payload(UUID.fromString(parts[0]), parts[1]));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private String sign(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC not available", e);
        }
    }
}
