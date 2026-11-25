package com.teguwaz.trip;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.trip.TripDtos.TripRequest;
import com.teguwaz.trip.TripDtos.TripResponse;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class TripService {

    private final TripRepository trips;
    private final DatabaseClient db;

    public TripService(TripRepository trips, DatabaseClient db) {
        this.trips = trips;
        this.db = db;
    }

    public Flux<TripResponse> list(UUID userId) {
        // Your trips and the trips shared with you. Counts include only memories you can see.
        return db.sql("""
                        SELECT t.id, t.name, t.description, t.start_date, t.end_date, t.created_at,
                               CASE WHEN t.user_id = :userId THEN 'OWNER' ELSE tm.role END AS role,
                               COALESCE(o.display_name, o.email) AS owner_name,
                               (SELECT count(*) FROM memories m WHERE m.trip_id = t.id
                                  AND (m.user_id = :userId OR m.privacy IN ('FAMILY', 'PUBLIC'))) AS memory_count,
                               (SELECT count(*) FROM trip_members x WHERE x.trip_id = t.id) AS member_count
                        FROM trips t
                        JOIN app_users o ON o.id = t.user_id
                        LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = :userId
                        WHERE t.user_id = :userId OR tm.user_id IS NOT NULL
                        ORDER BY t.start_date DESC NULLS LAST, t.created_at DESC
                        """)
                .bind("userId", userId)
                .map((row, meta) -> new TripResponse(
                        row.get("id", UUID.class),
                        row.get("name", String.class),
                        row.get("description", String.class),
                        row.get("start_date", LocalDate.class),
                        row.get("end_date", LocalDate.class),
                        orZero(row.get("memory_count", Long.class)),
                        row.get("role", String.class),
                        row.get("owner_name", String.class),
                        orZero(row.get("member_count", Long.class))))
                .all();
    }

    public Mono<TripResponse> get(UUID userId, UUID tripId) {
        return list(userId)
                .filter(t -> t.id().equals(tripId))
                .next()
                .switchIfEmpty(Mono.error(new NotFoundException("Trip", tripId)));
    }

    @Transactional
    public Mono<TripResponse> create(UUID userId, TripRequest req) {
        validateDates(req);
        return trips.save(Trip.create(userId, req.name().trim(), req.description(), req.startDate(), req.endDate()))
                .map(t -> toResponse(t, 0));
    }

    @Transactional
    public Mono<TripResponse> update(UUID userId, UUID tripId, TripRequest req) {
        validateDates(req);
        return trips.findByIdAndUserId(tripId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Trip", tripId)))
                .map(t -> t.withDetails(req.name().trim(), req.description(), req.startDate(), req.endDate()))
                .flatMap(trips::save)
                .then(get(userId, tripId));
    }

    /** Memories of a deleted trip are kept; their trip link is cleared by the database. */
    @Transactional
    public Mono<Void> delete(UUID userId, UUID tripId) {
        return trips.findByIdAndUserId(tripId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Trip", tripId)))
                .flatMap(trips::delete);
    }

    private static void validateDates(TripRequest req) {
        if (req.startDate() != null && req.endDate() != null && req.endDate().isBefore(req.startDate())) {
            throw new BadRequestException("endDate must not be before startDate");
        }
    }

    private static TripResponse toResponse(Trip t, long count) {
        return new TripResponse(t.id(), t.name(), t.description(), t.startDate(), t.endDate(), count, "OWNER", null, 0);
    }

    private static long orZero(Long v) {
        return v == null ? 0 : v;
    }
}
