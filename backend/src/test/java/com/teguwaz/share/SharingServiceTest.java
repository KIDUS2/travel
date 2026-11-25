package com.teguwaz.share;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.r2dbc.core.DatabaseClient;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.memory.MemoryRepository;
import com.teguwaz.memory.MemoryService;
import com.teguwaz.trip.TripRepository;

import reactor.test.StepVerifier;

class SharingServiceTest {

    private final DatabaseClient db = mock(DatabaseClient.class);
    private final TripRepository trips = mock(TripRepository.class);
    private final SharingService service = new SharingService(db, trips, mock(MemoryRepository.class), mock(MemoryService.class));

    @Test
    void onlyEditorAndViewerRolesExist() {
        UUID u = UUID.randomUUID();
        StepVerifier.create(service.createInvite(u, UUID.randomUUID(), "OWNER")).expectError(BadRequestException.class).verify();
        StepVerifier.create(service.changeRole(u, UUID.randomUUID(), UUID.randomUUID(), "ADMIN")).expectError(BadRequestException.class).verify();
        verifyNoInteractions(db, trips);
    }

    @Test
    void malformedInviteTokensAreNotLookedUp() {
        StepVerifier.create(service.preview(UUID.randomUUID(), "short")).expectError(NotFoundException.class).verify();
        verifyNoInteractions(db);
    }

    @Test
    void tokensAreStoredOnlyAsHashes() {
        String h = SharingService.hash("abcdefghijklmnopqrstuvwxyz012345");
        assertThat(h).hasSize(64).isEqualTo(SharingService.hash("abcdefghijklmnopqrstuvwxyz012345"));
        assertThat(h).doesNotContain("abcdef");
    }
}
