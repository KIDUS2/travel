package com.teguwaz.book;

import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface BookMediaRepository extends ReactiveCrudRepository<BookMedia, UUID> {

    Flux<BookMedia> findByBookIdOrderByCreatedAtAsc(UUID bookId);

    Mono<BookMedia> findByIdAndUserId(UUID id, UUID userId);

    Mono<Long> countByBookId(UUID bookId);
}
