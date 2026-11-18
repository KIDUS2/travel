package com.teguwaz.memory;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teguwaz.common.NotFoundException;
import com.teguwaz.common.PageResponse;
import com.teguwaz.media.MediaService;
import com.teguwaz.media.MemoryMedia;
import com.teguwaz.memory.MemoryDtos.MediaResponse;
import com.teguwaz.memory.MemoryDtos.MemoryRequest;
import com.teguwaz.memory.MemoryDtos.MemoryResponse;
import com.teguwaz.trip.TripRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class MemoryService {

    static final int MAX_PAGE_SIZE = 100;

    private final MemoryRepository memories;
    private final TripRepository trips;
    private final MediaService media;

    public MemoryService(MemoryRepository memories, TripRepository trips, MediaService media) {
        this.memories = memories;
        this.trips = trips;
        this.media = media;
    }

    public Mono<PageResponse<MemoryResponse>> list(UUID userId, UUID tripId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        PageRequest pageable = PageRequest.of(safePage, safeSize);

        Flux<Memory> items = tripId == null
                ? memories.findByUserIdOrderByHappenedAtDesc(userId, pageable)
                : memories.findByUserIdAndTripIdOrderByHappenedAtAsc(userId, tripId, pageable);
        Mono<Long> total = tripId == null
                ? memories.countByUserId(userId)
                : memories.countByUserIdAndTripId(userId, tripId);

        return items.collectList()
                .flatMap(this::withMediaAll)
                .zipWith(total)
                .map(t -> new PageResponse<>(t.getT1(), safePage, safeSize, t.getT2()));
    }

    public Mono<MemoryResponse> get(UUID userId, UUID memoryId) {
        return find(userId, memoryId).flatMap(this::withMedia);
    }

    @Transactional
    public Mono<MemoryResponse> create(UUID userId, MemoryRequest req) {
        Mono<Memory> existing = req.clientId() == null
                ? Mono.empty()
                : memories.findByUserIdAndClientId(userId, req.clientId());

        return existing
                .switchIfEmpty(Mono.defer(() -> checkTrip(userId, req.tripId())
                        .then(Mono.defer(() -> memories.save(newMemory(userId, req))))))
                .flatMap(this::withMedia);
    }

    @Transactional
    public Mono<MemoryResponse> update(UUID userId, UUID memoryId, MemoryRequest req) {
        return find(userId, memoryId)
                .flatMap(m -> checkTrip(userId, req.tripId()).thenReturn(m))
                .map(m -> m.withContent(req.tripId(), req.title().trim(), req.story(), req.placeName(),
                        req.regionCode(), req.latitude(), req.longitude(), req.happenedAt(),
                        req.privacy() != null ? req.privacy() : m.privacy()))
                .flatMap(memories::save)
                .flatMap(this::withMedia);
    }

    @Transactional
    public Mono<MemoryResponse> changePrivacy(UUID userId, UUID memoryId, Privacy privacy) {
        return find(userId, memoryId)
                .map(m -> m.withPrivacy(privacy))
                .flatMap(memories::save)
                .flatMap(this::withMedia);
    }

    /** Removes the stored files first, then the memory (media rows cascade). */
    @Transactional
    public Mono<Void> delete(UUID userId, UUID memoryId) {
        return find(userId, memoryId)
                .flatMap(m -> media.deleteAllForMemory(m.id()).then(memories.delete(m)));
    }

    Mono<Memory> find(UUID userId, UUID memoryId) {
        return memories.findByIdAndUserId(memoryId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Memory", memoryId)));
    }

    private Mono<Void> checkTrip(UUID userId, UUID tripId) {
        if (tripId == null) {
            return Mono.empty();
        }
        return trips.existsByIdAndUserId(tripId, userId)
                .flatMap(ok -> ok ? Mono.<Void>empty() : Mono.<Void>error(new NotFoundException("Trip", tripId)));
    }

    private static Memory newMemory(UUID userId, MemoryRequest req) {
        Instant now = Instant.now();
        return new Memory(null, userId, req.tripId(), req.clientId(), req.title().trim(), req.story(),
                req.placeName(), req.regionCode(), req.latitude(), req.longitude(), req.happenedAt(),
                req.privacy() != null ? req.privacy() : Privacy.PRIVATE, now, now);
    }

    private Mono<MemoryResponse> withMedia(Memory m) {
        return withMediaAll(List.of(m)).map(list -> list.get(0));
    }

    private Mono<List<MemoryResponse>> withMediaAll(List<Memory> list) {
        if (list.isEmpty()) {
            return Mono.just(List.of());
        }
        List<UUID> ids = list.stream().map(Memory::id).toList();
        return media.findForMemories(ids)
                .collect(Collectors.groupingBy(MemoryMedia::memoryId))
                .map(byMemory -> list.stream().map(m -> toResponse(m, byMemory)).toList());
    }

    private MemoryResponse toResponse(Memory m, Map<UUID, List<MemoryMedia>> byMemory) {
        List<MediaResponse> items = byMemory.getOrDefault(m.id(), List.of()).stream()
                .map(media::toResponse)
                .toList();
        return new MemoryResponse(m.id(), m.clientId(), m.tripId(), m.title(), m.story(), m.placeName(),
                m.regionCode(), m.latitude(), m.longitude(), m.happenedAt(), m.privacy(), items,
                m.createdAt(), m.updatedAt());
    }
}
