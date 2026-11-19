package com.teguwaz.storage;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Signs and checks links to locally stored files: HMAC-SHA256 over
 * "key|expiry". Without a configured key a random one is used, so links stop
 * working after a restart (fine for development, set a key in production).
 */
public class FileLinkSigner {

    private final byte[] key;
    private final Clock clock;

    public FileLinkSigner(String configuredKey, Clock clock) {
        this.clock = clock;
        if (configuredKey == null || configuredKey.isBlank()) {
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            this.key = random;
        } else {
            this.key = configuredKey.getBytes(StandardCharsets.UTF_8);
        }
    }

    public long expiryIn(int minutes) {
        return clock.instant().getEpochSecond() + minutes * 60L;
    }

    public String sign(String objectKey, long expiresAtEpochSecond) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hmac(objectKey + "|" + expiresAtEpochSecond));
    }

    public boolean isValid(String objectKey, long expiresAtEpochSecond, String signature) {
        if (signature == null || expiresAtEpochSecond < clock.instant().getEpochSecond()) {
            return false;
        }
        byte[] expected = hmac(objectKey + "|" + expiresAtEpochSecond);
        byte[] given;
        try {
            given = Base64.getUrlDecoder().decode(signature);
        } catch (IllegalArgumentException e) {
            return false;
        }
        return MessageDigest.isEqual(expected, given);
    }

    private byte[] hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC not available", e);
        }
    }
}
