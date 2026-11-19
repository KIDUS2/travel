package com.teguwaz.book;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("book_media")
public record BookMedia(
        @Id UUID id,
        UUID bookId,
        UUID userId,
        String objectKey,
        String contentType,
        long sizeBytes,
        Instant createdAt) {
}
