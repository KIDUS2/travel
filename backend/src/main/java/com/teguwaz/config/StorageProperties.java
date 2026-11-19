package com.teguwaz.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * File storage settings.
 * <ul>
 *   <li>{@code type}: {@code local} (default) stores files in {@code local.dir};
 *       {@code s3} uses the MinIO / S3 settings.</li>
 *   <li>{@code publicEndpoint} (s3) is the address browsers use, so URLs are signed for that host.</li>
 *   <li>{@code local.signingKey} signs file links; set it in production so links survive restarts.</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "teguwaz.storage")
public record StorageProperties(
        String type,
        Local local,
        String endpoint,
        String publicEndpoint,
        String accessKey,
        String secretKey,
        String bucket,
        String region,
        int presignExpiryMinutes) {

    public record Local(String dir, String signingKey, String publicBaseUrl) {
        public Local {
            if (dir == null || dir.isBlank()) {
                dir = "./data/uploads";
            }
            if (publicBaseUrl == null) {
                publicBaseUrl = "";
            }
        }
    }

    public StorageProperties {
        if (type == null || type.isBlank()) {
            type = "local";
        }
        if (local == null) {
            local = new Local(null, null, null);
        }
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
