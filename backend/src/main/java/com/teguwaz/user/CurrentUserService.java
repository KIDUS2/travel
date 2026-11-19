package com.teguwaz.user;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import com.teguwaz.common.ForbiddenException;

import reactor.core.publisher.Mono;

/**
 * Resolves the signed-in Keycloak user to a local {@link AppUser}, creating the
 * row on first sight. Suspended users are refused. A user is an admin when
 * their app role is ADMIN, their Keycloak token carries the realm role
 * "admin", or their email is in {@code teguwaz.admin-emails} (bootstrap).
 */
@Service
public class CurrentUserService {

    private static final Duration SEEN_EVERY = Duration.ofMinutes(10);

    private final AppUserRepository users;
    private final DatabaseClient db;
    private final Set<String> adminEmails;

    public CurrentUserService(AppUserRepository users, DatabaseClient db,
                              @Value("${teguwaz.admin-emails:}") String adminEmails) {
        this.users = users;
        this.db = db;
        this.adminEmails = Arrays.stream(adminEmails.split(","))
                .map(e -> e.trim().toLowerCase(Locale.ROOT)).filter(e -> !e.isEmpty()).collect(Collectors.toSet());
    }

    public Mono<AppUser> currentUser() {
        return jwt().flatMap(jwt -> findOrCreate(jwt).flatMap(u -> {
            if (u.isSuspended()) {
                return Mono.error(new ForbiddenException("This account is suspended. Contact the Teguwaz team."));
            }
            AppUser effective = !u.isAdmin() && isAdminByToken(jwt) ? u.withRole(AppUser.ADMIN) : u;
            return touch(effective).thenReturn(effective);
        }));
    }

    public Mono<UUID> currentUserId() {
        return currentUser().map(AppUser::id);
    }

    public Mono<AppUser> requireAdmin() {
        return currentUser().flatMap(u -> u.isAdmin() ? Mono.just(u) : Mono.error(new ForbiddenException("Admins only")));
    }

    private Mono<Jwt> jwt() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication())
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(auth -> ((JwtAuthenticationToken) auth).getToken())
                .switchIfEmpty(Mono.error(new IllegalStateException("No authenticated user")));
    }

    Mono<AppUser> findOrCreate(Jwt jwt) {
        String subject = jwt.getSubject();
        return users.findBySubject(subject)
                .switchIfEmpty(Mono.defer(() -> insertIfAbsent(jwt).then(users.findBySubject(subject))));
    }

    static boolean isAdminByToken(Jwt jwt) {
        Map<String, Object> realm = jwt.getClaimAsMap("realm_access");
        if (realm == null || !(realm.get("roles") instanceof Collection<?> roles)) {
            return false;
        }
        return roles.contains("admin");
    }

    /** Records activity at most every few minutes, so the admin list shows who is active. */
    private Mono<Void> touch(AppUser u) {
        if (u.lastSeenAt() != null && u.lastSeenAt().isAfter(Instant.now().minus(SEEN_EVERY))) {
            return Mono.empty();
        }
        return db.sql("UPDATE app_users SET last_seen_at = now() WHERE id = :id").bind("id", u.id()).fetch().rowsUpdated().then();
    }

    /** Insert that is safe when two first requests race. */
    private Mono<Long> insertIfAbsent(Jwt jwt) {
        String name = firstNonBlank(jwt.getClaimAsString("name"), jwt.getClaimAsString("preferred_username"));
        String email = jwt.getClaimAsString("email");
        String lang = "am".equalsIgnoreCase(jwt.getClaimAsString("locale")) ? "am" : "en";
        boolean admin = isAdminByToken(jwt) || (email != null && adminEmails.contains(email.toLowerCase(Locale.ROOT)));

        DatabaseClient.GenericExecuteSpec spec = db.sql("""
                        INSERT INTO app_users (subject, email, display_name, preferred_language, role)
                        VALUES (:subject, :email, :name, :lang, :role)
                        ON CONFLICT (subject) DO NOTHING
                        """)
                .bind("subject", jwt.getSubject())
                .bind("lang", lang)
                .bind("role", admin ? AppUser.ADMIN : AppUser.USER);
        spec = email != null ? spec.bind("email", email) : spec.bindNull("email", String.class);
        spec = name != null ? spec.bind("name", name) : spec.bindNull("name", String.class);
        return spec.fetch().rowsUpdated();
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return (b != null && !b.isBlank()) ? b : null;
    }
}
