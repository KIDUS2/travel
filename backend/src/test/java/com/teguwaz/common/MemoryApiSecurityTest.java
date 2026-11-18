package com.teguwaz.common;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers.mockJwt;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;

import com.teguwaz.config.CorsProperties;
import com.teguwaz.config.SecurityConfig;
import com.teguwaz.memory.MemoryController;
import com.teguwaz.memory.MemoryService;
import com.teguwaz.user.CurrentUserService;

import reactor.core.publisher.Mono;

@WebFluxTest(controllers = MemoryController.class)
@Import({SecurityConfig.class, GlobalErrorHandler.class})
@EnableConfigurationProperties(CorsProperties.class)
class MemoryApiSecurityTest {

    @Autowired
    WebTestClient client;

    @MockitoBean
    MemoryService service;

    @MockitoBean
    CurrentUserService currentUser;

    @MockitoBean
    ReactiveJwtDecoder jwtDecoder;

    @Test
    void anonymousRequestsAreRejected() {
        client.get().uri("/api/memories").exchange().expectStatus().isUnauthorized();
    }

    @Test
    void signedInUserCanListMemories() {
        UUID uid = UUID.randomUUID();
        when(currentUser.currentUserId()).thenReturn(Mono.just(uid));
        when(service.list(any(), isNull(), anyInt(), anyInt()))
                .thenReturn(Mono.just(new PageResponse<>(List.of(), 0, 20, 0)));

        client.mutateWith(mockJwt()).get().uri("/api/memories")
                .exchange()
                .expectStatus().isOk()
                .expectBody().jsonPath("$.total").isEqualTo(0);
    }

    @Test
    void invalidMemoryIsRejectedWithFieldErrors() {
        when(currentUser.currentUserId()).thenReturn(Mono.just(UUID.randomUUID()));

        client.mutateWith(mockJwt()).post().uri("/api/memories")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("{\"title\":\"\",\"latitude\":120}")
                .exchange()
                .expectStatus().isBadRequest()
                .expectBody()
                .jsonPath("$.fields.title").exists()
                .jsonPath("$.fields.latitude").exists()
                .jsonPath("$.fields.happenedAt").exists();
    }
}
