package com.teguwaz.connection;

import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface SocialConnectionRepository extends ReactiveCrudRepository<SocialConnection, UUID> {

    Flux<SocialConnection> findByUserId(UUID userId);

    Mono<SocialConnection> findByUserIdAndPlatform(UUID userId, String platform);
}
