package com.teguwaz.book;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teguwaz.book.BookDtos.BookRequest;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.trip.TripRepository;

import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class BookServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final UUID userId = UUID.randomUUID();
    private BookRepository books;
    private TripRepository trips;
    private BookService service;

    @BeforeEach
    void setUp() {
        books = mock(BookRepository.class);
        trips = mock(TripRepository.class);
        service = new BookService(books, trips, mapper);
        when(books.save(any())).thenAnswer(inv -> {
            Book b = inv.getArgument(0);
            return Mono.just(new Book(UUID.randomUUID(), b.userId(), b.tripId(), b.title(), b.bookType(),
                    b.settings(), b.pages(), b.status(), b.createdAt(), b.updatedAt()));
        });
    }

    @Test
    void savesPagesAndReturnsThem() throws Exception {
        JsonNode pages = mapper.readTree("[{\"id\":\"p1\",\"layout\":\"cover\",\"slots\":{\"title\":\"ሰላም\"}}]");

        StepVerifier.create(service.create(userId, new BookRequest("My Ethiopia", null, "classic", null, pages)))
                .expectNextMatches(r -> r.pages().size() == 1
                        && r.pages().get(0).path("slots").path("title").asText().equals("ሰላም")
                        && r.settings().isObject()
                        && r.status().equals("DRAFT"))
                .verifyComplete();
    }

    @Test
    void rejectsPagesThatAreNotAnArray() throws Exception {
        JsonNode pages = mapper.readTree("{\"layout\":\"cover\"}");

        StepVerifier.create(service.create(userId, new BookRequest("Book", null, "classic", null, pages)))
                .expectError(BadRequestException.class)
                .verify();
        verify(books, never()).save(any());
    }

    @Test
    void rejectsPagesWithoutLayout() throws Exception {
        JsonNode pages = mapper.readTree("[{\"id\":\"p1\"}]");

        StepVerifier.create(service.create(userId, new BookRequest("Book", null, "classic", null, pages)))
                .expectError(BadRequestException.class)
                .verify();
    }

    @Test
    void rejectsSomeoneElsesTrip() {
        UUID tripId = UUID.randomUUID();
        when(trips.existsByIdAndUserId(tripId, userId)).thenReturn(Mono.just(false));

        StepVerifier.create(service.create(userId, new BookRequest("Book", tripId, "classic", null, null)))
                .expectError(NotFoundException.class)
                .verify();
        verify(books, never()).save(any());
    }

    @Test
    void cannotOpenAnotherUsersBook() {
        UUID bookId = UUID.randomUUID();
        when(books.findByIdAndUserId(bookId, userId)).thenReturn(Mono.empty());

        StepVerifier.create(service.get(userId, bookId))
                .expectError(NotFoundException.class)
                .verify();
    }
}
