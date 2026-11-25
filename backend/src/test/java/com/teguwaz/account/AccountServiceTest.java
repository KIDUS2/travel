package com.teguwaz.account;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teguwaz.channel.ChannelRepository;
import com.teguwaz.channel.ChannelService;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.storage.StorageService;
import com.teguwaz.user.AppUser;

import reactor.test.StepVerifier;

class AccountServiceTest {

    private final DatabaseClient db = mock(DatabaseClient.class);
    private final StorageService storage = mock(StorageService.class);
    private final KeycloakAdminClient keycloak = new KeycloakAdminClient(WebClient.builder(), "http://localhost:8180", "teguwaz", "teguwaz-backend", "");
    private final AccountService service = new AccountService(db, storage, mock(ChannelRepository.class), mock(ChannelService.class), keycloak, new ObjectMapper());

    private final AppUser user = new AppUser(UUID.randomUUID(), "sub", "a@b.et", "A", "en", AppUser.USER, AppUser.ACTIVE, null, Instant.now(), Instant.now());

    @Test
    void deletingNeedsTheTypedConfirmation() {
        StepVerifier.create(service.deleteAccount(user, "delete")).expectError(BadRequestException.class).verify();
        StepVerifier.create(service.deleteAccount(user, null)).expectError(BadRequestException.class).verify();
        verifyNoInteractions(db, storage);
    }

    @Test
    void defaultPrivacyMustBeAKnownValue() {
        StepVerifier.create(service.updatePrivacy(user.id(), "EVERYONE")).expectError(BadRequestException.class).verify();
        verifyNoInteractions(db);
    }

    @Test
    void keycloakDeletionIsSkippedWhenNotConfigured() {
        StepVerifier.create(keycloak.deleteUser("sub")).expectNext(false).verifyComplete();
    }
}
