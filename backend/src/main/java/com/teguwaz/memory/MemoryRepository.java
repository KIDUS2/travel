package com.teguwaz.memory;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface MemoryRepository extends ReactiveCrudRepository<Memory, UUID> {

    Mono<Memory> findByIdAndUserId(UUID id, UUID userId);

    Mono<Memory> findByUserIdAndClientId(UUID userId, UUID clientId);

    Flux<Memory> findByUserIdOrderByHappenedAtDesc(UUID userId, Pageable pageable);

    Flux<Memory> findByUserIdAndTripIdOrderByHappenedAtAsc(UUID userId, UUID tripId, Pageable pageable);

    Mono<Long> countByUserId(UUID userId);

    Mono<Long> countByUserIdAndTripId(UUID userId, UUID tripId);
}
