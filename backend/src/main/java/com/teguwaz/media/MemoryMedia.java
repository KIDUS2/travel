package com.teguwaz.media;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("memory_media")
public record MemoryMedia(
        @Id UUID id,
        UUID memoryId,
        UUID userId,
        MediaKind kind,
        String objectKey,
        String contentType,
        long sizeBytes,
        int sortOrder,
        Instant createdAt) {
}
