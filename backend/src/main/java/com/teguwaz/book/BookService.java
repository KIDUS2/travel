package com.teguwaz.book;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.teguwaz.book.BookDtos.BookRequest;
import com.teguwaz.book.BookDtos.BookResponse;
import com.teguwaz.book.BookDtos.BookSummary;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.trip.TripRepository;

import io.r2dbc.postgresql.codec.Json;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class BookService {

    static final int MAX_PAGES = 200;
    static final int MAX_JSON_BYTES = 1_000_000;

    private final BookRepository books;
    private final TripRepository trips;
    private final BookMediaService photos;
    private final ObjectMapper mapper;

    public BookService(BookRepository books, TripRepository trips, BookMediaService photos, ObjectMapper mapper) {
        this.books = books;
        this.trips = trips;
        this.photos = photos;
        this.mapper = mapper;
    }

    public Flux<BookSummary> list(UUID userId) {
        return books.findByUserIdOrderByUpdatedAtDesc(userId).map(this::toSummary);
    }

    public Mono<BookResponse> get(UUID userId, UUID bookId) {
        return find(userId, bookId).map(this::toResponse);
    }

    @Transactional
    public Mono<BookResponse> create(UUID userId, BookRequest req) {
        return Mono.fromCallable(() -> new Json[] {settingsJson(req.settings()), pagesJson(req.pages())})
                .flatMap(json -> checkTrip(userId, req.tripId())
                        .then(Mono.defer(() -> books.save(Book.create(userId, req.tripId(), req.title().trim(),
                                req.bookType(), json[0], json[1])))))
                .map(this::toResponse);
    }

    /** Saves the whole book; the editor autosaves with this. */
    @Transactional
    public Mono<BookResponse> update(UUID userId, UUID bookId, BookRequest req) {
        return Mono.fromCallable(() -> new Json[] {settingsJson(req.settings()), pagesJson(req.pages())})
                .flatMap(json -> find(userId, bookId)
                        .flatMap(b -> checkTrip(userId, req.tripId()).thenReturn(b))
                        .map(b -> b.withContent(req.tripId(), req.title().trim(), req.bookType(), json[0], json[1])))
                .flatMap(books::save)
                .map(this::toResponse);
    }

    @Transactional
    public Mono<Void> delete(UUID userId, UUID bookId) {
        return find(userId, bookId)
                .flatMap(b -> photos.deleteAllForBook(b.id()).then(books.delete(b)));
    }

    private Mono<Book> find(UUID userId, UUID bookId) {
        return books.findByIdAndUserId(bookId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Book", bookId)));
    }

    private Mono<Void> checkTrip(UUID userId, UUID tripId) {
        if (tripId == null) {
            return Mono.empty();
        }
        return trips.existsByIdAndUserId(tripId, userId)
                .flatMap(ok -> ok ? Mono.<Void>empty() : Mono.<Void>error(new NotFoundException("Trip", tripId)));
    }

    Json settingsJson(JsonNode settings) {
        JsonNode node = settings == null || settings.isNull() ? JsonNodeFactory.instance.objectNode() : settings;
        if (!node.isObject()) {
            throw new BadRequestException("settings must be an object");
        }
        return toJson(node);
    }

    Json pagesJson(JsonNode pages) {
        JsonNode node = pages == null || pages.isNull() ? JsonNodeFactory.instance.arrayNode() : pages;
        if (!node.isArray()) {
            throw new BadRequestException("pages must be an array");
        }
        if (node.size() > MAX_PAGES) {
            throw new BadRequestException("A book can have at most " + MAX_PAGES + " pages");
        }
        for (JsonNode page : node) {
            if (!page.isObject() || !page.path("layout").isTextual()) {
                throw new BadRequestException("Every page needs a layout");
            }
        }
        return toJson(node);
    }

    private Json toJson(JsonNode node) {
        try {
            byte[] bytes = mapper.writeValueAsBytes(node);
            if (bytes.length > MAX_JSON_BYTES) {
                throw new BadRequestException("Book content is too large");
            }
            return Json.of(bytes);
        } catch (JsonProcessingException e) {
            throw new BadRequestException("Invalid book content");
        }
    }

    private JsonNode fromJson(Json json, JsonNode fallback) {
        if (json == null) {
            return fallback;
        }
        try {
            return mapper.readTree(json.asString().getBytes(StandardCharsets.UTF_8));
        } catch (java.io.IOException e) {
            return fallback;
        }
    }

    private BookSummary toSummary(Book b) {
        JsonNode pages = fromJson(b.pages(), JsonNodeFactory.instance.arrayNode());
        return new BookSummary(b.id(), b.title(), b.tripId(), b.bookType(), b.status(), pages.size(),
                fromJson(b.settings(), JsonNodeFactory.instance.objectNode()), b.updatedAt());
    }

    private BookResponse toResponse(Book b) {
        return new BookResponse(b.id(), b.title(), b.tripId(), b.bookType(), b.status(),
                fromJson(b.settings(), JsonNodeFactory.instance.objectNode()),
                fromJson(b.pages(), JsonNodeFactory.instance.arrayNode()),
                b.createdAt(), b.updatedAt());
    }
}
