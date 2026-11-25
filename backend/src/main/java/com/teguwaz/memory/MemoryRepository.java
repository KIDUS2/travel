package com.teguwaz.memory;

import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.r2dbc.repository.Query;
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

    /** A shared trip as one member sees it: their own memories, plus everyone's Family and Public ones. */
    @Query("""
            SELECT * FROM memories
            WHERE trip_id = :tripId AND (user_id = :userId OR privacy IN ('FAMILY', 'PUBLIC'))
            ORDER BY happened_at ASC
            LIMIT :limit OFFSET :offset
            """)
    Flux<Memory> findVisibleInTrip(UUID tripId, UUID userId, int limit, long offset);

    @Query("SELECT count(*) FROM memories WHERE trip_id = :tripId AND (user_id = :userId OR privacy IN ('FAMILY', 'PUBLIC'))")
    Mono<Long> countVisibleInTrip(UUID tripId, UUID userId);
}
