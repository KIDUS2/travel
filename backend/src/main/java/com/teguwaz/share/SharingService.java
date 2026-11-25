package com.teguwaz.share;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;

import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.ForbiddenException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.memory.Memory;
import com.teguwaz.memory.MemoryDtos.MemoryResponse;
import com.teguwaz.memory.MemoryRepository;
import com.teguwaz.memory.MemoryService;
import com.teguwaz.trip.TripRepository;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Shared trips. The owner creates invite links (editor: can add memories, viewer: can only look).
 * Members see their own memories plus everyone's Family and Public memories in the trip; Only-me
 * memories stay private even inside a shared trip. People can edit only their own memories.
 */
@Service
public class SharingService {

    static final Set<String> ROLES = Set.of("EDITOR", "VIEWER");
    static final Duration INVITE_LIFETIME = Duration.ofDays(14);
    static final int MAX_MEMBERS = 50;

    private final DatabaseClient db;
    private final TripRepository trips;
    private final MemoryRepository memories;
    private final MemoryService memoryService;
    private final SecureRandom random = new SecureRandom();

    public SharingService(DatabaseClient db, TripRepository trips, MemoryRepository memories, MemoryService memoryService) {
        this.db = db;
        this.trips = trips;
        this.memories = memories;
        this.memoryService = memoryService;
    }

    public record Member(UUID userId, String name, String role, boolean you, Instant joinedAt) {
    }

    public record Invite(UUID id, String role, Instant expiresAt, int uses, Instant createdAt) {
    }

    /** Returned once, when the link is made: the token is not stored, only its hash. */
    public record NewInvite(UUID id, String token, String role, Instant expiresAt) {
    }

    public record InvitePreview(UUID tripId, String tripName, String ownerName, String role, boolean alreadyMember, boolean expired) {
    }

    public record TripMemory(MemoryResponse memory, UUID authorId, String authorName, boolean mine) {
    }

    public record TripFeed(List<TripMemory> items, long total) {
    }

    // ---- access ------------------------------------------------------------

    private Mono<Void> requireOwner(UUID userId, UUID tripId) {
        return trips.existsByIdAndUserId(tripId, userId)
                .flatMap(ok -> ok ? Mono.<Void>empty() : Mono.<Void>error(new NotFoundException("Trip", tripId)));
    }

    private Mono<Void> requireMember(UUID userId, UUID tripId) {
        return trips.canView(tripId, userId)
                .flatMap(ok -> ok ? Mono.<Void>empty() : Mono.<Void>error(new NotFoundException("Trip", tripId)));
    }

    // ---- members -----------------------------------------------------------

    public Flux<Member> members(UUID userId, UUID tripId) {
        return requireMember(userId, tripId).thenMany(db.sql("""
                        SELECT u.id, COALESCE(u.display_name, split_part(u.email, '@', 1), 'Traveler') AS name, 'OWNER' AS role, t.created_at AS joined_at
                        FROM trips t JOIN app_users u ON u.id = t.user_id WHERE t.id = :tripId
                        UNION ALL
                        SELECT u.id, COALESCE(u.display_name, split_part(u.email, '@', 1), 'Traveler'), m.role, m.joined_at
                        FROM trip_members m JOIN app_users u ON u.id = m.user_id WHERE m.trip_id = :tripId
                        ORDER BY joined_at""")
                .bind("tripId", tripId)
                .map(row -> {
                    UUID id = row.get("id", UUID.class);
                    return new Member(id, row.get("name", String.class), row.get("role", String.class), userId.equals(id),
                            row.get("joined_at", Instant.class));
                })
                .all());
    }

    public Mono<Void> changeRole(UUID ownerId, UUID tripId, UUID memberId, String role) {
        if (!ROLES.contains(role)) {
            return Mono.error(new BadRequestException("role must be EDITOR or VIEWER"));
        }
        return requireOwner(ownerId, tripId).then(db.sql("UPDATE trip_members SET role = :role WHERE trip_id = :t AND user_id = :u")
                .bind("role", role).bind("t", tripId).bind("u", memberId).fetch().rowsUpdated()
                .flatMap(n -> n == 0 ? Mono.<Void>error(new NotFoundException("Member", memberId)) : Mono.<Void>empty()));
    }

    /** The owner removes someone, or a member leaves. Their memories stay theirs but leave the trip. */
    public Mono<Void> removeMember(UUID userId, UUID tripId, UUID memberId) {
        Mono<Void> allowed = userId.equals(memberId) ? Mono.empty() : requireOwner(userId, tripId);
        return allowed
                .then(db.sql("DELETE FROM trip_members WHERE trip_id = :t AND user_id = :u").bind("t", tripId).bind("u", memberId)
                        .fetch().rowsUpdated())
                .flatMap(n -> n == 0 ? Mono.<Void>error(new NotFoundException("Member", memberId))
                        : db.sql("UPDATE memories SET trip_id = NULL, updated_at = now() WHERE trip_id = :t AND user_id = :u")
                                .bind("t", tripId).bind("u", memberId).fetch().rowsUpdated().then());
    }

    // ---- invites -----------------------------------------------------------

    public Mono<NewInvite> createInvite(UUID ownerId, UUID tripId, String role) {
        if (!ROLES.contains(role)) {
            return Mono.error(new BadRequestException("role must be EDITOR or VIEWER"));
        }
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = Instant.now().plus(INVITE_LIFETIME);
        return requireOwner(ownerId, tripId).then(db.sql("""
                        INSERT INTO trip_invites (trip_id, token_hash, role, created_by, expires_at)
                        VALUES (:t, :h, :role, :by, :exp) RETURNING id""")
                .bind("t", tripId).bind("h", hash(token)).bind("role", role).bind("by", ownerId).bind("exp", expires)
                .map(row -> row.get("id", UUID.class))
                .one()
                .map(id -> new NewInvite(id, token, role, expires)));
    }

    public Flux<Invite> invites(UUID ownerId, UUID tripId) {
        return requireOwner(ownerId, tripId).thenMany(db.sql("""
                        SELECT id, role, expires_at, uses, created_at FROM trip_invites
                        WHERE trip_id = :t AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC""")
                .bind("t", tripId)
                .map(row -> new Invite(row.get("id", UUID.class), row.get("role", String.class), row.get("expires_at", Instant.class),
                        row.get("uses", Integer.class), row.get("created_at", Instant.class)))
                .all());
    }

    public Mono<Void> revokeInvite(UUID ownerId, UUID tripId, UUID inviteId) {
        return requireOwner(ownerId, tripId).then(db.sql("UPDATE trip_invites SET revoked_at = now() WHERE id = :id AND trip_id = :t")
                .bind("id", inviteId).bind("t", tripId).fetch().rowsUpdated().then());
    }

    record InviteRow(UUID tripId, String tripName, UUID ownerId, String ownerName, String role, boolean usable) {
    }

    private Mono<InviteRow> findInvite(String token) {
        if (token == null || token.length() < 20 || token.length() > 64) {
            return Mono.error(new NotFoundException("Invite", "link"));
        }
        return db.sql("""
                        SELECT i.trip_id, t.name, t.user_id AS owner_id, COALESCE(o.display_name, o.email) AS owner_name, i.role,
                               (i.revoked_at IS NULL AND i.expires_at > now()) AS usable
                        FROM trip_invites i JOIN trips t ON t.id = i.trip_id JOIN app_users o ON o.id = t.user_id
                        WHERE i.token_hash = :h""")
                .bind("h", hash(token))
                .map(row -> new InviteRow(row.get("trip_id", UUID.class), row.get("name", String.class), row.get("owner_id", UUID.class),
                        row.get("owner_name", String.class), row.get("role", String.class), Boolean.TRUE.equals(row.get("usable", Boolean.class))))
                .one()
                .switchIfEmpty(Mono.error(new NotFoundException("Invite", "link")));
    }

    public Mono<InvitePreview> preview(UUID userId, String token) {
        return findInvite(token).flatMap(i -> trips.canView(i.tripId(), userId)
                .map(member -> new InvitePreview(i.tripId(), i.tripName(), i.ownerName(), i.role(), member, !i.usable())));
    }

    /** Joins the trip. Accepting again never lowers an editor to viewer. */
    public Mono<UUID> accept(UUID userId, String token) {
        return findInvite(token).flatMap(i -> {
            if (!i.usable()) {
                return Mono.error(new BadRequestException("This invite link has expired or was turned off. Ask for a new one."));
            }
            if (i.ownerId().equals(userId)) {
                return Mono.just(i.tripId());
            }
            Mono<Long> count = db.sql("SELECT count(*) AS n FROM trip_members WHERE trip_id = :t").bind("t", i.tripId())
                    .map(row -> row.get("n", Long.class)).one();
            return count.flatMap(n -> n >= MAX_MEMBERS
                    ? Mono.<UUID>error(new ForbiddenException("This trip already has " + MAX_MEMBERS + " members"))
                    : db.sql("""
                                    INSERT INTO trip_members (trip_id, user_id, role) VALUES (:t, :u, :role)
                                    ON CONFLICT (trip_id, user_id) DO UPDATE
                                    SET role = CASE WHEN trip_members.role = 'EDITOR' THEN 'EDITOR' ELSE EXCLUDED.role END""")
                            .bind("t", i.tripId()).bind("u", userId).bind("role", i.role())
                            .fetch().rowsUpdated()
                            .then(db.sql("UPDATE trip_invites SET uses = uses + 1 WHERE token_hash = :h").bind("h", hash(token)).fetch().rowsUpdated())
                            .thenReturn(i.tripId()));
        });
    }

    // ---- the shared feed ---------------------------------------------------

    public Mono<TripFeed> feed(UUID userId, UUID tripId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        long offset = (long) Math.max(page, 0) * safeSize;
        return requireMember(userId, tripId)
                .then(Mono.zip(memories.findVisibleInTrip(tripId, userId, safeSize, offset).collectList(),
                        memories.countVisibleInTrip(tripId, userId)))
                .flatMap(t -> {
                    List<Memory> list = t.getT1();
                    Mono<Map<UUID, String>> names = authors(list.stream().map(Memory::userId).distinct().toList());
                    return Mono.zip(memoryService.responses(list), names).map(z -> {
                        List<TripMemory> items = new java.util.ArrayList<>();
                        for (int i = 0; i < list.size(); i++) {
                            UUID author = list.get(i).userId();
                            items.add(new TripMemory(z.getT1().get(i), author, z.getT2().getOrDefault(author, "Traveler"), userId.equals(author)));
                        }
                        return new TripFeed(items, t.getT2());
                    });
                });
    }

    private Mono<Map<UUID, String>> authors(List<UUID> ids) {
        if (ids.isEmpty()) {
            return Mono.just(Map.of());
        }
        return db.sql("SELECT id, COALESCE(display_name, split_part(email, '@', 1), 'Traveler') AS name FROM app_users WHERE id = ANY(:ids)")
                .bind("ids", ids.toArray(new UUID[0]))
                .map(row -> Map.entry(row.get("id", UUID.class), row.get("name", String.class)))
                .all()
                .collectMap(Map.Entry::getKey, Map.Entry::getValue);
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
