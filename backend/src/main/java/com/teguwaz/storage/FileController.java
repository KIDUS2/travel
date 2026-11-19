package com.teguwaz.storage;

import java.nio.file.Path;
import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Mono;

/**
 * Serves locally stored files behind signed, expiring links. The link itself
 * is the permission (like an S3 presigned URL), so no login header is needed
 * and {@code <img src>} works.
 */
@RestController
@ConditionalOnProperty(prefix = "teguwaz.storage", name = "type", havingValue = "local", matchIfMissing = true)
public class FileController {

    private static final String PREFIX = "/api/files/";

    private final LocalStorageService storage;

    public FileController(LocalStorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/api/files/**")
    public Mono<ResponseEntity<Resource>> get(ServerHttpRequest request,
                                              @RequestParam long exp,
                                              @RequestParam String sig) {
        String path = request.getPath().pathWithinApplication().value();
        String key = java.net.URLDecoder.decode(path.substring(PREFIX.length()), java.nio.charset.StandardCharsets.UTF_8);
        return Mono.fromCallable(() -> storage.openIfValid(key, exp, sig))
                .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
                .map(found -> found.<ResponseEntity<Resource>>map(this::ok)
                        .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build()));
    }

    private ResponseEntity<Resource> ok(Path file) {
        Resource resource = new FileSystemResource(file);
        MediaType type = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(30)).cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }
}
