package com.teguwaz.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import io.minio.MinioClient;

/** Only used when {@code teguwaz.storage.type=s3}. */
@Configuration
@ConditionalOnProperty(prefix = "teguwaz.storage", name = "type", havingValue = "s3")
public class MinioConfig {

    /** Client used by the backend to read and write objects. */
    @Bean
    @Primary
    MinioClient minioClient(StorageProperties props) {
        return MinioClient.builder()
                .endpoint(props.endpoint())
                .region(props.region())
                .credentials(props.accessKey(), props.secretKey())
                .build();
    }

    /**
     * Client used only to sign download URLs for the browser. The region is set
     * so signing needs no network call to the public host.
     */
    @Bean
    @Qualifier("presignMinioClient")
    MinioClient presignMinioClient(StorageProperties props) {
        return MinioClient.builder()
                .endpoint(props.publicEndpoint())
                .region(props.region())
                .credentials(props.accessKey(), props.secretKey())
                .build();
    }
}
