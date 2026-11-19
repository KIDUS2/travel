package com.teguwaz.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.r2dbc.core.DatabaseClient;

import com.teguwaz.admin.AdminService.UserUpdate;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.user.AppUser;
import com.teguwaz.user.AppUserRepository;

import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class AdminServiceTest {

    private final AppUserRepository users = mock(AppUserRepository.class);
    private final AdminService service = new AdminService(mock(DatabaseClient.class), users);

    private AppUser user(String role, String status) {
        return new AppUser(UUID.randomUUID(), "sub", "a@b.et", "A", "en", role, status, null, Instant.now(), Instant.now());
    }

    @Test
    void adminCannotDemoteOrSuspendThemselves() {
        AppUser admin = user(AppUser.ADMIN, AppUser.ACTIVE);
        StepVerifier.create(service.update(admin, admin.id(), new UserUpdate("USER", null))).expectError(BadRequestException.class).verify();
        StepVerifier.create(service.update(admin, admin.id(), new UserUpdate(null, "SUSPENDED"))).expectError(BadRequestException.class).verify();
        verify(users, never()).save(any());
    }

    @Test
    void adminCanSuspendAndPromoteOthers() {
        AppUser admin = user(AppUser.ADMIN, AppUser.ACTIVE);
        AppUser other = user(AppUser.USER, AppUser.ACTIVE);
        when(users.findById(other.id())).thenReturn(Mono.just(other));
        when(users.save(any())).thenAnswer(inv -> Mono.just(inv.getArgument(0)));

        StepVerifier.create(service.update(admin, other.id(), new UserUpdate("ADMIN", "SUSPENDED")))
                .expectNextMatches(u -> u.isAdmin() && u.isSuspended())
                .verifyComplete();
    }
}
