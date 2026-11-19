package com.teguwaz.media;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Collection;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.memory.MemoryDtos.MediaResponse;
import com.teguwaz.memory.MemoryRepository;
import com.teguwaz.storage.StorageService;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
public class MediaService {

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);
    static final int MAX_MEDIA_PER_MEMORY = 50;

    private final MemoryMediaRepository mediaRepo;
    private final MemoryRepository memories;
    private final StorageService storage;

    public MediaService(MemoryMediaRepository mediaRepo, MemoryRepository memories, StorageService storage) {
        this.mediaRepo = mediaRepo;
        this.memories = memories;
        this.storage = storage;
    }

    public Flux<MemoryMedia> findForMemories(Collection<UUID> memoryIds) {
        return mediaRepo.findByMemoryIdInOrderBySortOrderAsc(memoryIds);
    }

    public MediaResponse toResponse(MemoryMedia m) {
        return new MediaResponse(m.id(), m.kind(), m.contentType(), m.sizeBytes(), m.sortOrder(),
                storage.presignedGetUrl(m.objectKey()));
    }

    /**
     * Streams the upload to a temp file (never fully into memory), stores it,
     * then records it. The temp file is always removed.
     */
    public Mono<MediaResponse> upload(UUID userId, UUID memoryId, FilePart file) {
        String contentType = file.headers().getContentType() != null
                ? file.headers().getContentType().toString()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        MediaKind kind = MediaKind.fromContentType(contentType)
                .orElseThrow(() -> new BadRequestException("Only photos, videos and audio can be uploaded"));

        return memories.findByIdAndUserId(memoryId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Memory", memoryId)))
                .flatMap(memory -> mediaRepo.countByMemoryId(memoryId))
                .flatMap(count -> {
                    if (count >= MAX_MEDIA_PER_MEMORY) {
                        return Mono.<MemoryMedia>error(new BadRequestException("A memory can hold at most " + MAX_MEDIA_PER_MEMORY + " files"));
                    }
                    String key = "users/%s/memories/%s/%s%s".formatted(userId, memoryId, UUID.randomUUID(),
                            extension(file.filename()));
                    return Mono.usingWhen(
                            createTempFile(),
                            tmp -> file.transferTo(tmp)
                                    .then(Mono.fromCallable(() -> Files.size(tmp)).subscribeOn(Schedulers.boundedElastic()))
                                    .flatMap(size -> storage.upload(key, tmp, contentType)
                                            .then(mediaRepo.save(new MemoryMedia(null, memoryId, userId, kind, key,
                                                    contentType, size, count.intValue(), Instant.now())))),
                            this::deleteTempFile);
                })
                .map(this::toResponse);
    }

    public Mono<Void> delete(UUID userId, UUID memoryId, UUID mediaId) {
        return mediaRepo.findByIdAndUserId(mediaId, userId)
                .filter(m -> m.memoryId().equals(memoryId))
                .switchIfEmpty(Mono.error(new NotFoundException("Media", mediaId)))
                .flatMap(m -> storage.delete(m.objectKey()).then(mediaRepo.delete(m)));
    }

    /** Used when a memory is deleted. Rows are removed by the database cascade. */
    public Mono<Void> deleteAllForMemory(UUID memoryId) {
        return mediaRepo.findByMemoryId(memoryId)
                .flatMap(m -> storage.delete(m.objectKey())
                        .onErrorResume(e -> {
                            log.warn("Could not delete {} from storage: {}", m.objectKey(), e.getMessage());
                            return Mono.empty();
                        }))
                .then();
    }

    private static Mono<Path> createTempFile() {
        return Mono.fromCallable(() -> Files.createTempFile("teguwaz-upload-", ".bin"))
                .subscribeOn(Schedulers.boundedElastic());
    }

    private Mono<Void> deleteTempFile(Path tmp) {
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
