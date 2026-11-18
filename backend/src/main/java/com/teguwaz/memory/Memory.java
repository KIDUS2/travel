package com.teguwaz.memory;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("memories")
public record Memory(
        @Id UUID id,
        UUID userId,
        UUID tripId,
        UUID clientId,
        String title,
        String story,
        String placeName,
        String regionCode,
        Double latitude,
        Double longitude,
        Instant happenedAt,
        Privacy privacy,
        Instant createdAt,
        Instant updatedAt) {

    public Memory withContent(UUID tripId, String title, String story, String placeName, String regionCode,
                              Double latitude, Double longitude, Instant happenedAt, Privacy privacy) {
        return new Memory(id, userId, tripId, clientId, title, story, placeName, regionCode,
                latitude, longitude, happenedAt, privacy, createdAt, Instant.now());
    }

    public Memory withPrivacy(Privacy privacy) {
        return new Memory(id, userId, tripId, clientId, title, story, placeName, regionCode,
                latitude, longitude, happenedAt, privacy, createdAt, Instant.now());
    }
}
