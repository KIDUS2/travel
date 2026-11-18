package com.teguwaz.media;

import java.util.Collection;
import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface MemoryMediaRepository extends ReactiveCrudRepository<MemoryMedia, UUID> {

    Flux<MemoryMedia> findByMemoryIdInOrderBySortOrderAsc(Collection<UUID> memoryIds);

    Flux<MemoryMedia> findByMemoryId(UUID memoryId);

    Mono<MemoryMedia> findByIdAndUserId(UUID id, UUID userId);

    Mono<Long> countByMemoryId(UUID memoryId);
}
