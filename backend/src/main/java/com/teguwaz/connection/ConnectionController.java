package com.teguwaz.connection;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.connection.ConnectionDtos.ConnectionStatus;
import com.teguwaz.connection.ConnectionDtos.StartResponse;
import com.teguwaz.connection.ConnectionDtos.YouTubeStats;
import com.teguwaz.user.CurrentUserService;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    private final ConnectionService service;
    private final CurrentUserService currentUser;

    public ConnectionController(ConnectionService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public Flux<ConnectionStatus> list() {
        return currentUser.currentUserId().flatMapMany(service::list);
    }

    /** Returns the platform's sign-in page; the app sends the browser there. */
    @PostMapping("/{platform}/start")
    public Mono<StartResponse> start(@PathVariable String platform) {
        checkPlatform(platform);
        return currentUser.currentUserId().flatMap(uid -> service.start(uid, platform)).map(StartResponse::new);
    }

    /** Public: the platform redirects the browser here with a code and our signed state. */
    @GetMapping("/{platform}/callback")
    public Mono<ResponseEntity<Void>> callback(@PathVariable String platform,
                                               @RequestParam(required = false) String code,
                                               @RequestParam(required = false) String state,
                                               @RequestParam(required = false) String error) {
        checkPlatform(platform);
        return service.callback(platform, code, state, error)
                .map(uri -> ResponseEntity.status(HttpStatus.FOUND).location(uri).<Void>build());
    }

    @GetMapping("/youtube/stats")
    public Mono<YouTubeStats> youtubeStats() {
        return currentUser.currentUserId().flatMap(service::youtubeStats);
    }

    @DeleteMapping("/{platform}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> disconnect(@PathVariable String platform) {
        checkPlatform(platform);
        return currentUser.currentUserId().flatMap(uid -> service.disconnect(uid, platform));
    }

    private static void checkPlatform(String platform) {
        if (!ConnectionService.PLATFORMS.contains(platform)) {
            throw new BadRequestException("Unknown platform: " + platform);
        }
    }
}
