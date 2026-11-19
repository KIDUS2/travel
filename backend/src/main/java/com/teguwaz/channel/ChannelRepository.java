package com.teguwaz.channel;

import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ChannelRepository extends ReactiveCrudRepository<Channel, UUID> {

    Flux<Channel> findByUserIdOrderByCreatedAtAsc(UUID userId);

    Mono<Channel> findByIdAndUserId(UUID id, UUID userId);

    Mono<Long> countByUserId(UUID userId);
}
