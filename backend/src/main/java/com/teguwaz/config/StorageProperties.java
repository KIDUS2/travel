package com.teguwaz.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * MinIO / S3 settings. {@code publicEndpoint} is the address browsers use to
 * load media, so presigned URLs are signed for that host.
 */
@ConfigurationProperties(prefix = "teguwaz.storage")
public record StorageProperties(
        String endpoint,
        String publicEndpoint,
        String accessKey,
        String secretKey,
        String bucket,
        String region,
        int presignExpiryMinutes) {

    public StorageProperties {
        if (publicEndpoint == null || publicEndpoint.isBlank()) {
            publicEndpoint = endpoint;
        }
        if (region == null || region.isBlank()) {
            region = "us-east-1";
        }
        if (presignExpiryMinutes <= 0) {
            presignExpiryMinutes = 60;
        }
    }
}
