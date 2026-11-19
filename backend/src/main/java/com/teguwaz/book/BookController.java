package com.teguwaz.book;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.book.BookDtos.BookRequest;
import com.teguwaz.book.BookDtos.BookResponse;
import com.teguwaz.book.BookDtos.BookSummary;
import com.teguwaz.book.BookMediaService.BookPhoto;
import com.teguwaz.user.CurrentUserService;

import jakarta.validation.Valid;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService service;
    private final BookMediaService photos;
    private final CurrentUserService currentUser;

    public BookController(BookService service, BookMediaService photos, CurrentUserService currentUser) {
        this.service = service;
        this.photos = photos;
        this.currentUser = currentUser;
    }

    @GetMapping
    public Flux<BookSummary> list() {
        return currentUser.currentUserId().flatMapMany(service::list);
    }

    @GetMapping("/{id}")
    public Mono<BookResponse> get(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.get(uid, id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<BookResponse> create(@Valid @RequestBody BookRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.create(uid, req));
    }

    @PutMapping("/{id}")
    public Mono<BookResponse> update(@PathVariable UUID id, @Valid @RequestBody BookRequest req) {
        return currentUser.currentUserId().flatMap(uid -> service.update(uid, id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(uid -> service.delete(uid, id));
    }

    /** Photos uploaded from the device into this book. */
    @GetMapping("/{id}/photos")
    public Flux<BookPhoto> listPhotos(@PathVariable UUID id) {
        return currentUser.currentUserId()
                .flatMapMany(uid -> service.get(uid, id).thenMany(photos.list(id)));
    }

    @PostMapping(path = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<BookPhoto> uploadPhoto(@PathVariable UUID id, @RequestPart("file") Mono<FilePart> file) {
        return currentUser.currentUserId().flatMap(uid -> file.flatMap(fp -> photos.upload(uid, id, fp)));
    }

    @DeleteMapping("/{id}/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deletePhoto(@PathVariable UUID id, @PathVariable UUID photoId) {
        return currentUser.currentUserId().flatMap(uid -> photos.delete(uid, id, photoId));
    }
}
