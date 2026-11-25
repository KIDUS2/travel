package com.teguwaz.share;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.share.SharingService.Invite;
import com.teguwaz.share.SharingService.InvitePreview;
import com.teguwaz.share.SharingService.Member;
import com.teguwaz.share.SharingService.NewInvite;
import com.teguwaz.share.SharingService.TripFeed;
import com.teguwaz.user.CurrentUserService;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
public class SharingController {

    private final CurrentUserService currentUser;
    private final SharingService sharing;

    public SharingController(CurrentUserService currentUser, SharingService sharing) {
        this.currentUser = currentUser;
        this.sharing = sharing;
    }

    public record RoleBody(String role) {
    }

    public record Joined(UUID tripId) {
    }

    @GetMapping("/api/trips/{tripId}/members")
    public Flux<Member> members(@PathVariable UUID tripId) {
        return currentUser.currentUserId().flatMapMany(u -> sharing.members(u, tripId));
    }

    @PatchMapping("/api/trips/{tripId}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> changeRole(@PathVariable UUID tripId, @PathVariable UUID memberId, @RequestBody RoleBody body) {
        return currentUser.currentUserId().flatMap(u -> sharing.changeRole(u, tripId, memberId, body.role()));
    }

    @DeleteMapping("/api/trips/{tripId}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> remove(@PathVariable UUID tripId, @PathVariable UUID memberId) {
        return currentUser.currentUserId().flatMap(u -> sharing.removeMember(u, tripId, memberId));
    }

    @GetMapping("/api/trips/{tripId}/invites")
    public Flux<Invite> invites(@PathVariable UUID tripId) {
        return currentUser.currentUserId().flatMapMany(u -> sharing.invites(u, tripId));
    }

    @PostMapping("/api/trips/{tripId}/invites")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<NewInvite> invite(@PathVariable UUID tripId, @RequestBody RoleBody body) {
        return currentUser.currentUserId().flatMap(u -> sharing.createInvite(u, tripId, body.role()));
    }

    @DeleteMapping("/api/trips/{tripId}/invites/{inviteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> revoke(@PathVariable UUID tripId, @PathVariable UUID inviteId) {
        return currentUser.currentUserId().flatMap(u -> sharing.revokeInvite(u, tripId, inviteId));
    }

    @GetMapping("/api/trips/{tripId}/feed")
    public Mono<TripFeed> feed(@PathVariable UUID tripId, @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "100") int size) {
        return currentUser.currentUserId().flatMap(u -> sharing.feed(u, tripId, page, size));
    }

    @GetMapping("/api/invites/{token}")
    public Mono<InvitePreview> preview(@PathVariable String token) {
        return currentUser.currentUserId().flatMap(u -> sharing.preview(u, token));
    }

    @PostMapping("/api/invites/{token}/accept")
    public Mono<Joined> accept(@PathVariable String token) {
        return currentUser.currentUserId().flatMap(u -> sharing.accept(u, token)).map(Joined::new);
    }
}
