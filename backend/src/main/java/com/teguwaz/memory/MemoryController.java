package com.teguwaz.memory;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.common.PageResponse;
import com.teguwaz.memory.MemoryDtos.MemoryRequest;
import com.teguwaz.memory.MemoryDtos.MemoryResponse;
import com.teguwaz.memory.MemoryDtos.PrivacyRequest;
import com.teguwaz.user.CurrentUserService;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService service;
    private final CurrentUserService currentUser;

    public MemoryController(MemoryService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public Mono<PageResponse<MemoryResponse>> list(
            @RequestParam(required = false) UUID tripId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return currentUser.currentUserId().flatMap(uid -> service.list(uid, tripId, page, size));
    }

    @GetMapping("/{id}")
    public Mono<MemoryResponse> get(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.get(uid, id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<MemoryResponse> create(@Valid @RequestBody MemoryRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.create(uid, req));
    }

    @PutMapping("/{id}")
    public Mono<MemoryResponse> update(@PathVariable UUID id, @Valid @RequestBody MemoryRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.update(uid, id, req));
    }

    @PatchMapping("/{id}/privacy")
    public Mono<MemoryResponse> privacy(@PathVariable UUID id, @Valid @RequestBody PrivacyRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.changePrivacy(uid, id, req.privacy()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.delete(uid, id));
    }
}
