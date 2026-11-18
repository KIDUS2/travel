package com.teguwaz.media;

import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.teguwaz.config.StorageProperties;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.UploadObjectArgs;
import io.minio.http.Method;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Wraps the (blocking) MinIO client so callers stay non-blocking. Buckets are
 * private: browsers only get short-lived presigned URLs.
 */
@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final MinioClient client;
    private final MinioClient presignClient;
    private final StorageProperties props;

    public StorageService(MinioClient client,
                          @Qualifier("presignMinioClient") MinioClient presignClient,
                          StorageProperties props) {
        this.client = client;
        this.presignClient = presignClient;
        this.props = props;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureBucket() {
        Mono.fromCallable(() -> {
                    boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(props.bucket()).build());
                    if (!exists) {
                        client.makeBucket(MakeBucketArgs.builder().bucket(props.bucket()).build());
                        log.info("Created storage bucket {}", props.bucket());
                    }
                    return exists;
                })
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe(
                        ok -> { },
                        err -> log.warn("Could not check storage bucket {}: {}", props.bucket(), err.getMessage()));
    }

    public Mono<Void> upload(String objectKey, Path file, String contentType) {
        return Mono.fromCallable(() -> client.uploadObject(UploadObjectArgs.builder()
                        .bucket(props.bucket())
                        .object(objectKey)
                        .filename(file.toString())
                        .contentType(contentType)
                        .build()))
                .subscribeOn(Schedulers.boundedElastic())
                .then();
    }

    public Mono<Void> delete(String objectKey) {
        return Mono.fromRunnable(() -> {
                    try {
                        client.removeObject(RemoveObjectArgs.builder().bucket(props.bucket()).object(objectKey).build());
                    } catch (Exception e) {
                        throw new IllegalStateException("Could not delete object " + objectKey, e);
                    }
                })
                .subscribeOn(Schedulers.boundedElastic())
                .then();
    }

    /** Signing is local (region is preset), so this does not block on the network. */
    public String presignedGetUrl(String objectKey) {
        try {
            return presignClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(props.bucket())
                    .object(objectKey)
                    .expiry(props.presignExpiryMinutes(), TimeUnit.MINUTES)
                    .build());
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign URL for " + objectKey, e);
        }
    }
}
