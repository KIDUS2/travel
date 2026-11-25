package com.teguwaz.trip;

import java.util.UUID;

import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Mono;

public interface TripRepository extends ReactiveCrudRepository<Trip, UUID> {

    Mono<Trip> findByIdAndUserId(UUID id, UUID userId);

    Mono<Boolean> existsByIdAndUserId(UUID id, UUID userId);

    /** The trip's owner, or a member invited as editor. */
    @Query("""
            SELECT EXISTS (SELECT 1 FROM trips WHERE id = :tripId AND user_id = :userId)
                OR EXISTS (SELECT 1 FROM trip_members WHERE trip_id = :tripId AND user_id = :userId AND role = 'EDITOR')
            """)
    Mono<Boolean> canAddMemories(UUID tripId, UUID userId);

    /** The trip's owner, or any member. */
    @Query("""
            SELECT EXISTS (SELECT 1 FROM trips WHERE id = :tripId AND user_id = :userId)
                OR EXISTS (SELECT 1 FROM trip_members WHERE trip_id = :tripId AND user_id = :userId)
            """)
    Mono<Boolean> canView(UUID tripId, UUID userId);
}
