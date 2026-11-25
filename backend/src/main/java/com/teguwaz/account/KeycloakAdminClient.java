package com.teguwaz.account;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;

import reactor.core.publisher.Mono;

/**
 * Deletes a user's Keycloak sign-in when they delete their Teguwaz account.
 * Uses the client-credentials grant of a confidential client; disabled when no secret is set.
 */
@Component
public class KeycloakAdminClient {

    private static final Logger log = LoggerFactory.getLogger(KeycloakAdminClient.class);

    private final WebClient http;
    private final String baseUrl;
    private final String realm;
    private final String clientId;
    private final String clientSecret;

    public KeycloakAdminClient(WebClient.Builder builder,
                               @Value("${teguwaz.keycloak-admin.base-url:http://localhost:8180}") String baseUrl,
                               @Value("${teguwaz.keycloak-admin.realm:teguwaz}") String realm,
                               @Value("${teguwaz.keycloak-admin.client-id:teguwaz-backend}") String clientId,
                               @Value("${teguwaz.keycloak-admin.client-secret:}") String clientSecret) {
        this.http = builder.build();
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.realm = realm;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public boolean enabled() {
        return clientSecret != null && !clientSecret.isBlank();
    }

    /** Deletes the Keycloak user with this subject. Emits true when deleted, false when disabled or it failed. */
    public Mono<Boolean> deleteUser(String subject) {
        if (!enabled()) {
            return Mono.just(false);
        }
        return token()
                .flatMap(token -> http.delete()
                        .uri(baseUrl + "/admin/realms/{realm}/users/{id}", realm, subject)
                        .headers(h -> h.setBearerAuth(token))
                        .retrieve()
                        .toBodilessEntity()
                        .thenReturn(true))
                .onErrorResume(e -> {
                    log.warn("Could not delete Keycloak user {}: {}", subject, e.getMessage());
                    return Mono.just(false);
                });
    }

    private Mono<String> token() {
        return http.post()
                .uri(baseUrl + "/realms/{realm}/protocol/openid-connect/token", realm)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("grant_type", "client_credentials")
                        .with("client_id", clientId)
                        .with("client_secret", clientSecret))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(n -> n.path("access_token").asText());
    }
}
