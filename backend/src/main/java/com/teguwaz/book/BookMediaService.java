package com.teguwaz.book;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.media.MemoryMediaRepository;
import com.teguwaz.storage.StorageService;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/** Photos uploaded from the device straight into a book. */
@Service
public class BookMediaService {

    private static final Logger log = LoggerFactory.getLogger(BookMediaService.class);
    static final int MAX_PHOTOS_PER_BOOK = 500;

    public record BookPhoto(UUID id, String contentType, long sizeBytes, String url) {
    }

    private final BookMediaRepository mediaRepo;
    private final BookRepository books;
    private final MemoryMediaRepository memoryMedia;
    private final StorageService storage;

    public BookMediaService(BookMediaRepository mediaRepo, BookRepository books, MemoryMediaRepository memoryMedia,
                            StorageService storage) {
        this.mediaRepo = mediaRepo;
        this.books = books;
        this.memoryMedia = memoryMedia;
        this.storage = storage;
    }

    /**
     * Signed URL for a photo placed on a page, whether it was uploaded to the
     * book or belongs to one of the user's memories. Empty if not theirs.
     */
    public Mono<String> photoUrl(UUID userId, UUID photoId) {
        return mediaRepo.findByIdAndUserId(photoId, userId)
                .map(BookMedia::objectKey)
                .switchIfEmpty(Mono.defer(() -> memoryMedia.findByIdAndUserId(photoId, userId).map(m -> m.objectKey())))
                .map(storage::presignedGetUrl);
    }

    public Flux<BookPhoto> list(UUID bookId) {
        return mediaRepo.findByBookIdOrderByCreatedAtAsc(bookId).map(this::toPhoto);
    }

    public Mono<BookPhoto> upload(UUID userId, UUID bookId, FilePart file) {
        String contentType = file.headers().getContentType() != null ? file.headers().getContentType().toString() : "";
        if (!contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            return Mono.error(new BadRequestException("Only photos can be added to a book"));
        }
        return books.findByIdAndUserId(bookId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Book", bookId)))
                .flatMap(b -> mediaRepo.countByBookId(bookId))
                .flatMap(count -> {
                    if (count >= MAX_PHOTOS_PER_BOOK) {
                        return Mono.<BookMedia>error(new BadRequestException("A book can hold at most " + MAX_PHOTOS_PER_BOOK + " uploaded photos"));
                    }
                    String key = "users/%s/books/%s/%s%s".formatted(userId, bookId, UUID.randomUUID(), extension(file.filename()));
                    return Mono.usingWhen(
                            Mono.fromCallable(() -> Files.createTempFile("teguwaz-book-", ".bin")).subscribeOn(Schedulers.boundedElastic()),
                            tmp -> file.transferTo(tmp)
                                    .then(Mono.fromCallable(() -> Files.size(tmp)).subscribeOn(Schedulers.boundedElastic()))
                                    .flatMap(size -> storage.upload(key, tmp, contentType)
                                            .then(mediaRepo.save(new BookMedia(null, bookId, userId, key, contentType, size, Instant.now())))),
                            this::deleteTemp);
                })
                .map(this::toPhoto);
    }

    public Mono<Void> delete(UUID userId, UUID bookId, UUID photoId) {
        return mediaRepo.findByIdAndUserId(photoId, userId)
                .filter(m -> m.bookId().equals(bookId))
                .switchIfEmpty(Mono.error(new NotFoundException("Photo", photoId)))
                .flatMap(m -> storage.delete(m.objectKey()).then(mediaRepo.delete(m)));
    }

    /** Removes stored files when a book is deleted; rows go with the database cascade. */
    public Mono<Void> deleteAllForBook(UUID bookId) {
        return mediaRepo.findByBookIdOrderByCreatedAtAsc(bookId)
                .flatMap(m -> storage.delete(m.objectKey()).onErrorResume(e -> {
                    log.warn("Could not delete {} from storage: {}", m.objectKey(), e.getMessage());
                    return Mono.empty();
                }))
                .then();
    }

    private BookPhoto toPhoto(BookMedia m) {
        return new BookPhoto(m.id(), m.contentType(), m.sizeBytes(), storage.presignedGetUrl(m.objectKey()));
    }

    private Mono<Void> deleteTemp(Path tmp) {
        return Mono.fromRunnable(() -> {
            try {
                Files.deleteIfExists(tmp);
            } catch (IOException e) {
                log.warn("Could not delete temp file {}", tmp);
            }
        }).subscribeOn(Schedulers.boundedElastic()).then();
    }

    static String extension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        String ext = filename.substring(dot).toLowerCase(Locale.ROOT);
        return ext.matches("\\.[a-z0-9]{1,8}") ? ext : "";
    }
}
