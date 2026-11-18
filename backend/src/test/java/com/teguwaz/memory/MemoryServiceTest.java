package com.teguwaz.memory;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import com.teguwaz.common.NotFoundException;
import com.teguwaz.media.MediaService;
import com.teguwaz.memory.MemoryDtos.MemoryRequest;
import com.teguwaz.trip.TripRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class MemoryServiceTest {

    private final UUID userId = UUID.randomUUID();
    private MemoryRepository memories;
    private TripRepository trips;
    private MediaService media;
    private MemoryService service;

    @BeforeEach
    void setUp() {
        memories = mock(MemoryRepository.class);
        trips = mock(TripRepository.class);
        media = mock(MediaService.class);
        service = new MemoryService(memories, trips, media);
        when(media.findForMemories(any())).thenReturn(Flux.empty());
    }

    @Test
    void createWithKnownClientIdReturnsExistingMemoryInsteadOfDuplicating() {
        UUID clientId = UUID.randomUUID();
        Memory existing = memory(UUID.randomUUID(), clientId, Privacy.FAMILY);
        when(memories.findByUserIdAndClientId(userId, clientId)).thenReturn(Mono.just(existing));

        StepVerifier.create(service.create(userId, request(clientId, null)))
                .expectNextMatches(r -> r.id().equals(existing.id()) && r.privacy() == Privacy.FAMILY)
                .verifyComplete();

        verify(memories, never()).save(any());
    }

    @Test
    void newMemoryIsPrivateByDefault() {
        when(memories.save(any())).thenAnswer(inv -> {
            Memory m = inv.getArgument(0);
            return Mono.just(memory(UUID.randomUUID(), m.clientId(), m.privacy()));
        });

        StepVerifier.create(service.create(userId, request(null, null)))
                .expectNextMatches(r -> r.privacy() == Privacy.PRIVATE)
                .verifyComplete();
    }

    @Test
    void createRejectsTripOwnedBySomeoneElse() {
        UUID tripId = UUID.randomUUID();
        when(trips.existsByIdAndUserId(tripId, userId)).thenReturn(Mono.just(false));

        StepVerifier.create(service.create(userId, request(null, tripId)))
                .expectError(NotFoundException.class)
                .verify();

        verify(memories, never()).save(any());
    }

    @Test
    void cannotReadAnotherUsersMemory() {
        UUID memoryId = UUID.randomUUID();
        when(memories.findByIdAndUserId(memoryId, userId)).thenReturn(Mono.empty());

        StepVerifier.create(service.get(userId, memoryId))
                .expectError(NotFoundException.class)
                .verify();
    }

    @Test
    void listClampsPageSize() {
        when(memories.findByUserIdOrderByHappenedAtDesc(eq(userId), any())).thenReturn(Flux.empty());
        when(memories.countByUserId(userId)).thenReturn(Mono.just(0L));

        StepVerifier.create(service.list(userId, null, -3, 5000))
                .expectNextMatches(p -> p.page() == 0 && p.size() == MemoryService.MAX_PAGE_SIZE && p.items().isEmpty())
                .verifyComplete();

        verify(memories).findByUserIdOrderByHappenedAtDesc(userId, PageRequest.of(0, MemoryService.MAX_PAGE_SIZE));
    }

    private MemoryRequest request(UUID clientId, UUID tripId) {
        return new MemoryRequest(clientId, tripId, "Bete Giyorgis at sunrise", "story", "Lalibela", "ET-AM",
                12.03, 39.04, Instant.parse("2026-11-02T03:12:00Z"), null);
    }

    private Memory memory(UUID id, UUID clientId, Privacy privacy) {
        Instant now = Instant.now();
        return new Memory(id, userId, null, clientId, "Bete Giyorgis at sunrise", "story", "Lalibela", "ET-AM",
                12.03, 39.04, now, privacy, now, now);
    }
}
