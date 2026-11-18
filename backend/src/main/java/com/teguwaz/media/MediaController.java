package com.teguwaz.media;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.memory.MemoryDtos.MediaResponse;
import com.teguwaz.user.CurrentUserService;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/memories/{memoryId}/media")
public class MediaController {

    private final MediaService service;
    private final CurrentUserService currentUser;

    public MediaController(MediaService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<MediaResponse> upload(@PathVariable UUID memoryId, @RequestPart("file") Mono<FilePart> file) {
        return currentUser.currentUserId()
                .flatMap(uid -> file.flatMap(fp -> service.upload(uid, memoryId, fp)));
    }

    @DeleteMapping("/{mediaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID memoryId, @PathVariable UUID mediaId) {
        return currentUser.currentUserId().flatMap(uid -> service.delete(uid, memoryId, mediaId));
    }
}
