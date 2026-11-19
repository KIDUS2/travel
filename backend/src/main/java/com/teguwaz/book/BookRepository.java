package com.teguwaz.book;

import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface BookRepository extends ReactiveCrudRepository<Book, UUID> {

    Flux<Book> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    Mono<Book> findByIdAndUserId(UUID id, UUID userId);
}
