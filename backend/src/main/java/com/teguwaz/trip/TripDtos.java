package com.teguwaz.trip;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class TripDtos {

    private TripDtos() {
    }

    public record TripRequest(
            @NotBlank @Size(max = 160) String name,
            @Size(max = 2000) String description,
            LocalDate startDate,
            LocalDate endDate) {
    }

    public record TripResponse(
            UUID id,
            String name,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            long memoryCount,
            /** OWNER, EDITOR (can add memories) or VIEWER. */
            String role,
            String ownerName,
            long memberCount) {
    }
}
