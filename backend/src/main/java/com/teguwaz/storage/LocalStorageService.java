package com.teguwaz.storage;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.teguwaz.config.StorageProperties;

import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Stores files in a folder on this server ({@code teguwaz.storage.local.dir}).
 * The folder is never served directly: the browser gets a signed, expiring
 * link to {@code /api/files/{key}}, checked by {@link FileController}.
 * This is the default ({@code teguwaz.storage.type=local}).
 */
@Service
@ConditionalOnProperty(prefix = "teguwaz.storage", name = "type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final Path root;
    private final FileLinkSigner signer;
    private final StorageProperties props;

    public LocalStorageService(StorageProperties props) {
        this.props = props;
        this.root = Path.of(props.local().dir()).toAbsolutePath().normalize();
        this.signer = new FileLinkSigner(props.local().signingKey(), Clock.systemUTC());
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create upload folder " + root, e);
        }
        if (props.local().signingKey() == null || props.local().signingKey().isBlank()) {
            log.warn("teguwaz.storage.local.signing-key is not set: file links will stop working after a restart");
        }
        log.info("Storing uploaded files in {}", root);
    }

    @Override
    public Mono<Void> upload(String objectKey, Path file, String contentType) {
        return Mono.fromCallable(() -> {
                    Path target = resolve(objectKey).orElseThrow(() -> new IllegalArgumentException("Bad file key"));
                    Files.createDirectories(target.getParent());
                    Files.copy(file, target, StandardCopyOption.REPLACE_EXISTING);
                    return target;
                })
                .subscribeOn(Schedulers.boundedElastic())
                .then();
    }

    @Override
    public Mono<Void> delete(String objectKey) {
        return Mono.fromCallable(() -> {
                    Optional<Path> target = resolve(objectKey);
                    if (target.isPresent()) {
                        Files.deleteIfExists(target.get());
                    }
                    return true;
                })
                .subscribeOn(Schedulers.boundedElastic())
                .then();
    }

    @Override
    public String presignedGetUrl(String objectKey) {
        long exp = signer.expiryIn(props.presignExpiryMinutes());
        String sig = signer.sign(objectKey, exp);
        String encodedKey = URLEncoder.encode(objectKey, StandardCharsets.UTF_8).replace("%2F", "/");
        return props.local().publicBaseUrl() + "/api/files/" + encodedKey + "?exp=" + exp + "&sig=" + sig;
    }

    /** Checks a link and returns the file, if the signature is valid and the file exists. */
    public Optional<Path> openIfValid(String objectKey, long exp, String sig) {
        if (!signer.isValid(objectKey, exp, sig)) {
            return Optional.empty();
        }
        return resolve(objectKey).filter(Files::isRegularFile);
    }

    /** Keeps every path inside the upload folder (no "..", no absolute paths). */
    Optional<Path> resolve(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || objectKey.contains("\\") || objectKey.startsWith("/")) {
            return Optional.empty();
        }
        Path p = root.resolve(objectKey).normalize();
        return p.startsWith(root) && !p.equals(root) ? Optional.of(p) : Optional.empty();
    }
}
