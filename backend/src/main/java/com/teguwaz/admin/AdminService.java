package com.teguwaz.admin;

import java.time.Instant;
import java.util.UUID;

import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.common.PageResponse;
import com.teguwaz.user.AppUser;
import com.teguwaz.user.AppUserRepository;

import io.r2dbc.spi.Readable;
import jakarta.validation.constraints.Pattern;
import reactor.core.publisher.Mono;

/** User management for admins: list and search users, change role, suspend or reactivate. */
@Service
public class AdminService {

    public record UserRow(UUID id, String email, String displayName, String role, String status, Instant createdAt,
                          Instant lastSeenAt, long memories, long books, long channels) {
    }

    public record Summary(long users, long activeLast7Days, long admins, long suspended, long memories, long books, long channels) {
    }

    public record UserUpdate(@Pattern(regexp = "USER|ADMIN") String role, @Pattern(regexp = "ACTIVE|SUSPENDED") String status) {
    }

    static final int MAX_PAGE = 100;

    private final DatabaseClient db;
    private final AppUserRepository users;

    public AdminService(DatabaseClient db, AppUserRepository users) {
        this.db = db;
        this.users = users;
    }

    public Mono<PageResponse<UserRow>> list(String query, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), MAX_PAGE);
        String q = query == null || query.isBlank() ? null : "%" + query.trim().toLowerCase() + "%";
        String where = q == null ? "" : " WHERE lower(coalesce(u.email,'')) LIKE :q OR lower(coalesce(u.display_name,'')) LIKE :q ";

        DatabaseClient.GenericExecuteSpec rows = db.sql("""
                SELECT u.id, u.email, u.display_name, u.role, u.status, u.created_at, u.last_seen_at,
                       (SELECT count(*) FROM memories m WHERE m.user_id = u.id) AS memories,
                       (SELECT count(*) FROM books b WHERE b.user_id = u.id) AS books,
                       (SELECT count(*) FROM channels c WHERE c.user_id = u.id) AS channels
                FROM app_users u""" + where + """
                 ORDER BY u.last_seen_at DESC NULLS LAST, u.created_at DESC
                LIMIT :limit OFFSET :offset""")
                .bind("limit", s).bind("offset", p * s);
        DatabaseClient.GenericExecuteSpec count = db.sql("SELECT count(*) AS n FROM app_users u" + where);
        if (q != null) {
            rows = rows.bind("q", q);
            count = count.bind("q", q);
        }
        return rows.map(AdminService::toRow).all().collectList()
                .zipWith(count.map(r -> num(r, "n")).one())
                .map(t -> new PageResponse<>(t.getT1(), p, s, t.getT2()));
    }

    public Mono<Summary> summary() {
        return db.sql("""
                SELECT (SELECT count(*) FROM app_users) AS users,
                       (SELECT count(*) FROM app_users WHERE last_seen_at > now() - interval '7 days') AS active7,
                       (SELECT count(*) FROM app_users WHERE role = 'ADMIN') AS admins,
                       (SELECT count(*) FROM app_users WHERE status = 'SUSPENDED') AS suspended,
                       (SELECT count(*) FROM memories) AS memories,
                       (SELECT count(*) FROM books) AS books,
                       (SELECT count(*) FROM channels) AS channels""")
                .map(r -> new Summary(num(r, "users"), num(r, "active7"), num(r, "admins"), num(r, "suspended"),
                        num(r, "memories"), num(r, "books"), num(r, "channels")))
                .one();
    }

    /** Admins cannot remove their own admin role or suspend themselves (avoids locking everyone out). */
    public Mono<AppUser> update(AppUser actor, UUID userId, UserUpdate req) {
        if (actor.id().equals(userId)) {
            if (AppUser.USER.equals(req.role())) {
                return Mono.error(new BadRequestException("You cannot remove your own admin role"));
            }
            if (AppUser.SUSPENDED.equals(req.status())) {
                return Mono.error(new BadRequestException("You cannot suspend your own account"));
            }
        }
        return users.findById(userId)
                .switchIfEmpty(Mono.error(new NotFoundException("User", userId)))
                .map(u -> {
                    AppUser next = u;
                    if (req.role() != null) next = next.withRole(req.role());
                    if (req.status() != null) next = next.withStatus(req.status());
                    return next;
                })
                .flatMap(users::save);
    }

    private static UserRow toRow(Readable r) {
        return new UserRow(r.get("id", UUID.class), r.get("email", String.class), r.get("display_name", String.class),
                r.get("role", String.class), r.get("status", String.class), r.get("created_at", Instant.class),
                r.get("last_seen_at", Instant.class), num(r, "memories"), num(r, "books"), num(r, "channels"));
    }

    private static long num(Readable r, String col) {
        Number n = r.get(col, Number.class);
        return n == null ? 0 : n.longValue();
    }
}
