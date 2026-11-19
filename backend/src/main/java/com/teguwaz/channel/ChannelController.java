package com.teguwaz.channel;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.channel.ChannelDtos.ChannelRequest;
import com.teguwaz.channel.ChannelDtos.ChannelResponse;
import com.teguwaz.channel.ChannelDtos.PlatformInfo;
import com.teguwaz.channel.ChannelDtos.PublicStats;
import com.teguwaz.channel.ChannelDtos.StartResponse;
import com.teguwaz.channel.ChannelDtos.YouTubeStats;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.user.CurrentUserService;

import jakarta.validation.Valid;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/channels")
public class ChannelController {

    private final ChannelService service;
    private final CurrentUserService currentUser;

    public ChannelController(ChannelService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/platforms")
    public List<PlatformInfo> platforms() {
        return service.platforms();
    }

    @GetMapping
    public Flux<ChannelResponse> list() {
        return currentUser.currentUserId().flatMapMany(service::list);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ChannelResponse> create(@Valid @RequestBody ChannelRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.create(uid, req));
    }

    @PutMapping("/{id}")
    public Mono<ChannelResponse> update(@PathVariable UUID id, @Valid @RequestBody ChannelRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.update(uid, id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.delete(uid, id));
    }

    /** Returns the platform's sign-in page for connecting this channel's stats. */
    @PostMapping("/{id}/connect")
    public Mono<StartResponse> connect(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.startConnect(uid, id)).map(StartResponse::new);
    }

    @DeleteMapping("/{id}/connect")
    public Mono<ChannelResponse> disconnect(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.disconnect(uid, id));
    }

    /** Real public numbers for a YouTube channel, from its link (needs YOUTUBE_API_KEY on the server). */
    @GetMapping("/{id}/public-stats")
    public Mono<PublicStats> publicStats(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.publicStats(uid, id));
    }

    @GetMapping("/{id}/stats")
    public Mono<YouTubeStats> stats(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.stats(uid, id));
    }

    /** Public: the platform redirects the browser here with a code and our signed state. */
    @GetMapping("/oauth/{platform}/callback")
    public Mono<ResponseEntity<Void>> callback(@PathVariable String platform,
                                               @RequestParam(required = false) String code,
                                               @RequestParam(required = false) String state,
                                               @RequestParam(required = false) String error) {
        if (!ChannelService.ORDER.contains(platform)) {
            throw new BadRequestException("Unknown platform: " + platform);
        }
        return service.callback(platform, code, state, error)
                .map(uri -> ResponseEntity.status(HttpStatus.FOUND).location(uri).<Void>build());
    }
}
