package com.teguwaz.user;

import java.time.Instant;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final CurrentUserService currentUser;
    private final AppUserRepository users;

    public MeController(CurrentUserService currentUser, AppUserRepository users) {
        this.currentUser = currentUser;
        this.users = users;
    }

    @GetMapping
    public Mono<MeResponse> me() {
        return currentUser.currentUser().map(MeResponse::from);
    }

    @PutMapping
    public Mono<MeResponse> update(@Valid @RequestBody UpdateMeRequest req) {
        return currentUser.currentUser()
                .flatMap(effective -> users.findById(effective.id())
                        .map(stored -> stored.withProfile(req.displayName().trim(), req.preferredLanguage()))
                        .flatMap(users::save)
                        .map(saved -> MeResponse.from(saved.withRole(effective.role()))));
    }

    public record UpdateMeRequest(
            @NotBlank @Size(max = 120) String displayName,
            @NotBlank @Pattern(regexp = "en|am", message = "must be 'en' or 'am'") String preferredLanguage) {
    }

    public record MeResponse(UUID id, String email, String displayName, String preferredLanguage, String role,
                             String status, Instant createdAt) {
        static MeResponse from(AppUser u) {
            return new MeResponse(u.id(), u.email(), u.displayName(), u.preferredLanguage(), u.role(), u.status(), u.createdAt());
        }
    }
}
