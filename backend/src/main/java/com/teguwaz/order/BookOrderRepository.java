package com.teguwaz.order;

import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface BookOrderRepository extends ReactiveCrudRepository<BookOrder, UUID> {

    Flux<BookOrder> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Mono<BookOrder> findByIdAndUserId(UUID id, UUID userId);

    Mono<BookOrder> findByTxRef(String txRef);

    Flux<BookOrder> findAllByOrderByCreatedAtDesc();

    Flux<BookOrder> findByStatusOrderByCreatedAtDesc(String status);
}
