package com.teguwaz.trip;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.trip.TripDtos.TripRequest;
import com.teguwaz.trip.TripDtos.TripResponse;
import com.teguwaz.user.CurrentUserService;

import jakarta.validation.Valid;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final TripService service;
    private final CurrentUserService currentUser;

    public TripController(TripService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public Flux<TripResponse> list() {
        return currentUser.currentUserId().flatMapMany(service::list);
    }

    @GetMapping("/{id}")
    public Mono<TripResponse> get(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.get(uid, id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<TripResponse> create(@Valid @RequestBody TripRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.create(uid, req));
    }

    @PutMapping("/{id}")
    public Mono<TripResponse> update(@PathVariable UUID id, @Valid @RequestBody TripRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.update(uid, id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.delete(uid, id));
    }
}
