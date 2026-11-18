package com.teguwaz.user;

import java.util.UUID;

import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import reactor.core.publisher.Mono;

/**
 * Resolves the signed-in Keycloak user to a local {@link AppUser}, creating the
 * row on first sight. Everything else in the API is keyed by the local id.
 */
@Service
public class CurrentUserService {

    private final AppUserRepository users;
    private final DatabaseClient db;

    public CurrentUserService(AppUserRepository users, DatabaseClient db) {
        this.users = users;
        this.db = db;
    }

    public Mono<AppUser> currentUser() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication())
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(auth -> ((JwtAuthenticationToken) auth).getToken())
                .switchIfEmpty(Mono.error(new IllegalStateException("No authenticated user")))
                .flatMap(this::findOrCreate);
    }

    public Mono<UUID> currentUserId() {
        return currentUser().map(AppUser::id);
    }

    Mono<AppUser> findOrCreate(Jwt jwt) {
        String subject = jwt.getSubject();
        return users.findBySubject(subject)
                .switchIfEmpty(Mono.defer(() -> insertIfAbsent(jwt).then(users.findBySubject(subject))));
    }

    /** Insert that is safe when two first requests race. */
    private Mono<Long> insertIfAbsent(Jwt jwt) {
        String name = firstNonBlank(jwt.getClaimAsString("name"), jwt.getClaimAsString("preferred_username"));
        String email = jwt.getClaimAsString("email");
        String lang = "am".equalsIgnoreCase(jwt.getClaimAsString("locale")) ? "am" : "en";

        DatabaseClient.GenericExecuteSpec spec = db.sql("""
                        INSERT INTO app_users (subject, email, display_name, preferred_language)
                        VALUES (:subject, :email, :name, :lang)
                        ON CONFLICT (subject) DO NOTHING
                        """)
                .bind("subject", jwt.getSubject())
                .bind("lang", lang);
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
