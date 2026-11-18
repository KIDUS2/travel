package com.teguwaz.user;

import java.util.UUID;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import reactor.core.publisher.Mono;

public interface AppUserRepository extends ReactiveCrudRepository<AppUser, UUID> {

    Mono<AppUser> findBySubject(String subject);
}
