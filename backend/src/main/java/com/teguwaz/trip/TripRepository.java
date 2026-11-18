package com.teguwaz.trip;

import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Mono;

public interface TripRepository extends ReactiveCrudRepository<Trip, UUID> {

    Mono<Trip> findByIdAndUserId(UUID id, UUID userId);

    Mono<Boolean> existsByIdAndUserId(UUID id, UUID userId);
}
