package com.teguwaz.account;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teguwaz.channel.ChannelRepository;
import com.teguwaz.channel.ChannelService;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.storage.StorageService;
import com.teguwaz.user.AppUser;

import io.r2dbc.postgresql.codec.Json;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * The traveler's control over their own data: default visibility, a full export, and account deletion.
 */
@Service
public class AccountService {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);
    static final Set<String> PRIVACY = Set.of("PRIVATE", "FAMILY", "PUBLIC");
    public static final String DELETE_CONFIRMATION = "DELETE";

    private final DatabaseClient db;
    private final StorageService storage;
    private final ChannelRepository channels;
    private final ChannelService channelService;
    private final KeycloakAdminClient keycloak;
    private final ObjectMapper json;

    public AccountService(DatabaseClient db, StorageService storage, ChannelRepository channels, ChannelService channelService,
                          KeycloakAdminClient keycloak, ObjectMapper json) {
        this.db = db;
        this.storage = storage;
        this.channels = channels;
        this.channelService = channelService;
        this.keycloak = keycloak;
        this.json = json;
    }

    public record PrivacySettings(String defaultPrivacy) {
    }

    public Mono<PrivacySettings> privacy(UUID userId) {
        return db.sql("SELECT default_privacy FROM app_users WHERE id = :id").bind("id", userId)
                .map(row -> new PrivacySettings(row.get("default_privacy", String.class)))
                .one()
                .defaultIfEmpty(new PrivacySettings("PRIVATE"));
    }

    public Mono<PrivacySettings> updatePrivacy(UUID userId, String defaultPrivacy) {
        if (defaultPrivacy == null || !PRIVACY.contains(defaultPrivacy)) {
            return Mono.error(new BadRequestException("defaultPrivacy must be PRIVATE, FAMILY or PUBLIC"));
        }
        return db.sql("UPDATE app_users SET default_privacy = :p, updated_at = now() WHERE id = :id")
                .bind("p", defaultPrivacy).bind("id", userId)
                .fetch().rowsUpdated()
                .thenReturn(new PrivacySettings(defaultPrivacy));
    }

    // ---- export ------------------------------------------------------------

    /** Everything Teguwaz stores about the traveler, as one JSON document. File links stay valid for about an hour. */
    public Mono<Map<String, Object>> export(UUID userId) {
        Mono<Map<String, Object>> profile = rows("""
                SELECT id, email, display_name, preferred_language, default_privacy, role, created_at
                FROM app_users WHERE id = :id""", userId).next();
        Mono<List<Map<String, Object>>> trips = rows("""
                SELECT id, name, description, start_date, end_date, created_at FROM trips WHERE user_id = :id ORDER BY start_date""", userId).collectList();
        Mono<List<Map<String, Object>>> memories = rows("""
                SELECT id, trip_id, title, story, place_name, region_code, latitude, longitude, happened_at, privacy, created_at
                FROM memories WHERE user_id = :id ORDER BY happened_at""", userId).collectList();
        Mono<List<Map<String, Object>>> media = rows("""
                SELECT memory_id, kind, content_type, size_bytes, object_key FROM memory_media WHERE user_id = :id ORDER BY memory_id, sort_order""", userId)
                .map(this::withDownloadLink).collectList();
        Mono<List<Map<String, Object>>> books = rows("""
                SELECT id, trip_id, title, book_type, settings, pages, status, created_at, updated_at FROM books WHERE user_id = :id""", userId).collectList();
        Mono<List<Map<String, Object>>> bookPhotos = rows("""
                SELECT book_id, content_type, size_bytes, object_key FROM book_media WHERE user_id = :id""", userId)
                .map(this::withDownloadLink).collectList();
        // Channel access tokens are never exported.
        Mono<List<Map<String, Object>>> channelRows = rows("""
                SELECT platform, name, url, account_name, connected_at, created_at FROM channels WHERE user_id = :id""", userId).collectList();

        return Mono.zip(profile, trips, memories, media, books, bookPhotos, channelRows).map(t -> {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("exportedAt", Instant.now());
            out.put("about", "Your Teguwaz data. Photo download links expire about an hour after export; export again for fresh links.");
            out.put("profile", t.getT1());
            out.put("trips", t.getT2());
            out.put("memories", t.getT3());
            out.put("memoryFiles", t.getT4());
            out.put("books", t.getT5());
            out.put("bookPhotos", t.getT6());
            out.put("channels", t.getT7());
            return out;
        });
    }

    private Map<String, Object> withDownloadLink(Map<String, Object> row) {
        Object key = row.remove("object_key");
        if (key != null) {
            row.put("downloadUrl", storage.presignedGetUrl(key.toString()));
        }
        return row;
    }

    private Flux<Map<String, Object>> rows(String sql, UUID userId) {
        return db.sql(sql).bind("id", userId).fetch().all().map(this::plain);
    }

    /** JSONB columns come back as a driver type; turn them into normal JSON. */
    private Map<String, Object> plain(Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        row.forEach((k, v) -> {
            if (v instanceof Json j) {
                try {
                    out.put(k, json.readTree(j.asString()));
                } catch (Exception e) {
                    out.put(k, j.asString());
                }
            } else {
                out.put(k, v);
            }
        });
        return out;
    }

    // ---- deletion ----------------------------------------------------------

    public record DeletionResult(long filesDeleted, boolean signInDeleted) {
    }

    /**
     * Deletes the account and everything in it: files in storage, channel connections (tokens revoked),
     * then the user row, which cascades to trips, memories, books and channels. The Keycloak sign-in is
     * removed too when the admin client is configured.
     */
    public Mono<DeletionResult> deleteAccount(AppUser user, String confirmation) {
        if (!DELETE_CONFIRMATION.equals(confirmation)) {
            return Mono.error(new BadRequestException("Type DELETE to confirm"));
        }
        UUID id = user.id();
        Mono<Long> files = db.sql("SELECT object_key FROM memory_media WHERE user_id = :id UNION ALL SELECT object_key FROM book_media WHERE user_id = :id")
                .bind("id", id)
                .map(row -> row.get("object_key", String.class))
                .all()
                .flatMap(key -> storage.delete(key).thenReturn(1L).onErrorResume(e -> {
                    log.warn("Could not delete file {}: {}", key, e.getMessage());
                    return Mono.just(0L);
                }), 4)
                .reduce(0L, Long::sum);
        Mono<Void> revokeChannels = channels.findByUserIdOrderByCreatedAtAsc(id)
                .concatMap(c -> channelService.delete(id, c.id()).onErrorResume(e -> Mono.empty()))
                .then();
        Mono<Void> deleteRow = db.sql("DELETE FROM app_users WHERE id = :id").bind("id", id).fetch().rowsUpdated().then();

        return files.flatMap(count -> revokeChannels
                .then(deleteRow)
                .then(keycloak.deleteUser(user.subject()))
                .map(signIn -> new DeletionResult(count, signIn)));
    }
}
