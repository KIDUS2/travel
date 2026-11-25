package com.teguwaz.order;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Chapa payment gateway (chapa.co): telebirr, CBE Birr, M-Pesa, bank transfer and cards. */
@ConfigurationProperties(prefix = "teguwaz.payments.chapa")
public record ChapaProperties(String secretKey, String baseUrl, String backendPublicUrl) {

    public ChapaProperties {
        baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://api.chapa.co" : baseUrl.replaceAll("/+$", "");
        backendPublicUrl = backendPublicUrl == null || backendPublicUrl.isBlank() ? "http://localhost:8080" : backendPublicUrl.replaceAll("/+$", "");
    }

    public boolean configured() {
        return secretKey != null && !secretKey.isBlank();
    }

    public boolean testMode() {
        return configured() && secretKey.startsWith("CHASECK_TEST");
    }
}
