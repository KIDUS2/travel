package com.teguwaz.admin;

import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.admin.AdminService.Summary;
import com.teguwaz.admin.AdminService.UserRow;
import com.teguwaz.admin.AdminService.UserUpdate;
import com.teguwaz.common.PageResponse;
import com.teguwaz.user.CurrentUserService;

import jakarta.validation.Valid;
import reactor.core.publisher.Mono;

/** Admin-only user management. Every call checks the caller is an admin. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService service;
    private final CurrentUserService currentUser;

    public AdminController(AdminService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/summary")
    public Mono<Summary> summary() {
        return currentUser.requireAdmin().then(service.summary());
    }

    @GetMapping("/users")
    public Mono<PageResponse<UserRow>> users(@RequestParam(required = false) String query,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size) {
        return currentUser.requireAdmin().then(service.list(query, page, size));
    }

    @PatchMapping("/users/{id}")
    public Mono<UserRow> update(@PathVariable UUID id, @Valid @RequestBody UserUpdate req) {
        return currentUser.requireAdmin()
                .flatMap(actor -> service.update(actor, id, req))
                .map(u -> new UserRow(u.id(), u.email(), u.displayName(), u.role(), u.status(), u.createdAt(), u.lastSeenAt(), 0, 0, 0));
    }
}
