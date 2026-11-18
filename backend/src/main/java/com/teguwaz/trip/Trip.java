package com.teguwaz.trip;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("trips")
public record Trip(
        @Id UUID id,
        UUID userId,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        Instant createdAt,
        Instant updatedAt) {

    public static Trip create(UUID userId, String name, String description, LocalDate start, LocalDate end) {
        Instant now = Instant.now();
        return new Trip(null, userId, name, description, start, end, now, now);
    }

    public Trip withDetails(String name, String description, LocalDate start, LocalDate end) {
        return new Trip(id, userId, name, description, start, end, createdAt, Instant.now());
    }
}
