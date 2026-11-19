package com.teguwaz.user;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("app_users")
public record AppUser(
        @Id UUID id,
        String subject,
        String email,
        String displayName,
        String preferredLanguage,
        String role,
        String status,
        Instant lastSeenAt,
        Instant createdAt,
        Instant updatedAt) {

    public static final String ADMIN = "ADMIN";
    public static final String USER = "USER";
    public static final String ACTIVE = "ACTIVE";
    public static final String SUSPENDED = "SUSPENDED";

    public boolean isAdmin() {
        return ADMIN.equals(role);
    }

    public boolean isSuspended() {
        return SUSPENDED.equals(status);
    }

    public AppUser withProfile(String displayName, String preferredLanguage) {
        return new AppUser(id, subject, email, displayName, preferredLanguage, role, status, lastSeenAt, createdAt, Instant.now());
    }

    public AppUser withRole(String role) {
        return new AppUser(id, subject, email, displayName, preferredLanguage, role, status, lastSeenAt, createdAt, Instant.now());
    }

    public AppUser withStatus(String status) {
        return new AppUser(id, subject, email, displayName, preferredLanguage, role, status, lastSeenAt, createdAt, Instant.now());
    }
}
