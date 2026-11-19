package com.teguwaz.storage;

import java.nio.file.Path;

import reactor.core.publisher.Mono;

/**
 * Where uploaded files live. Two implementations, chosen with
 * {@code teguwaz.storage.type}: {@code local} (a folder on this server, the
 * default) or {@code s3} (MinIO, SeaweedFS or any S3-compatible store).
 * Object keys are the same for both, so files can be moved between them.
 */
public interface StorageService {

    Mono<Void> upload(String objectKey, Path file, String contentType);

    Mono<Void> delete(String objectKey);

    /** A short-lived URL the browser can load the file from. */
    String presignedGetUrl(String objectKey);
}
