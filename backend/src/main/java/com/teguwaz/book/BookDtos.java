package com.teguwaz.book;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class BookDtos {

    private BookDtos() {
    }

    /**
     * Create or save a book. {@code pages} is the editor's page array; each page
     * holds a layout, a background and slots. Photos are referenced by media id.
     */
    public record BookRequest(
            @NotBlank @Size(max = 160) String title,
            UUID tripId,
            @NotBlank @Pattern(regexp = "classic|journal|atlas|mini|custom") String bookType,
            JsonNode settings,
            JsonNode pages) {
    }

    public record BookSummary(
            UUID id,
            String title,
            UUID tripId,
            String bookType,
            String status,
            int pageCount,
            JsonNode settings,
            Instant updatedAt) {
    }

    public record BookResponse(
            UUID id,
            String title,
            UUID tripId,
            String bookType,
            String status,
            JsonNode settings,
            JsonNode pages,
            Instant createdAt,
            Instant updatedAt) {
    }
}
