package com.teguwaz.book;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import io.r2dbc.postgresql.codec.Json;

@Table("books")
public record Book(
        @Id UUID id,
        UUID userId,
        UUID tripId,
        String title,
        String bookType,
        Json settings,
        Json pages,
        String status,
        Instant createdAt,
        Instant updatedAt) {

    public static Book create(UUID userId, UUID tripId, String title, String bookType, Json settings, Json pages) {
        Instant now = Instant.now();
        return new Book(null, userId, tripId, title, bookType, settings, pages, "DRAFT", now, now);
    }

    public Book withContent(UUID tripId, String title, String bookType, Json settings, Json pages) {
        return new Book(id, userId, tripId, title, bookType, settings, pages, status, createdAt, Instant.now());
    }
}
