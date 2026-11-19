package com.teguwaz.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.teguwaz.config.StorageProperties;

class LocalStorageTest {

    @TempDir
    Path dir;

    private LocalStorageService storage() {
        return new LocalStorageService(new StorageProperties("local",
                new StorageProperties.Local(dir.toString(), "test-key", ""), null, null, null, null, null, null, 60));
    }

    @Test
    void storesFileAndServesItThroughASignedLink() throws Exception {
        LocalStorageService s = storage();
        Path src = Files.writeString(dir.resolve("src.txt"), "ሰላም");
        s.upload("users/u1/memories/m1/a.jpg", src, "image/jpeg").block();

        String url = s.presignedGetUrl("users/u1/memories/m1/a.jpg");
        assertThat(url).startsWith("/api/files/users/u1/memories/m1/a.jpg?exp=");
        long exp = Long.parseLong(url.replaceAll(".*exp=(\\d+).*", "$1"));
        String sig = url.replaceAll(".*sig=", "");

        assertThat(s.openIfValid("users/u1/memories/m1/a.jpg", exp, sig)).isPresent();
        assertThat(Files.readString(dir.resolve("users/u1/memories/m1/a.jpg"))).isEqualTo("ሰላም");
    }

    @Test
    void rejectsTamperedOrOtherFilesLinks() throws Exception {
        LocalStorageService s = storage();
        Path src = Files.writeString(dir.resolve("src.txt"), "x");
        s.upload("users/u1/a.jpg", src, "image/jpeg").block();
        s.upload("users/u2/b.jpg", src, "image/jpeg").block();
        String url = s.presignedGetUrl("users/u1/a.jpg");
        long exp = Long.parseLong(url.replaceAll(".*exp=(\\d+).*", "$1"));
        String sig = url.replaceAll(".*sig=", "");

        assertThat(s.openIfValid("users/u2/b.jpg", exp, sig)).isEmpty();
        assertThat(s.openIfValid("users/u1/a.jpg", exp + 1, sig)).isEmpty();
        assertThat(s.openIfValid("users/u1/a.jpg", exp, "bad")).isEmpty();
    }

    @Test
    void keysCannotEscapeTheUploadFolder() {
        LocalStorageService s = storage();
        assertThat(s.resolve("../outside.txt")).isEmpty();
        assertThat(s.resolve("users/../../outside.txt")).isEmpty();
        assertThat(s.resolve("/etc/passwd")).isEmpty();
        assertThat(s.resolve("users\\..\\x")).isEmpty();
        assertThat(s.resolve("users/u1/a.jpg")).isPresent();
    }

    @Test
    void expiredLinksAreRejected() {
        Clock past = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
        FileLinkSigner oldSigner = new FileLinkSigner("k", past);
        long exp = oldSigner.expiryIn(60);
        String sig = oldSigner.sign("a.jpg", exp);
        FileLinkSigner now = new FileLinkSigner("k", Clock.systemUTC());
        assertThat(now.isValid("a.jpg", exp, sig)).isFalse();
        assertThat(oldSigner.isValid("a.jpg", exp, sig)).isTrue();
    }
}
