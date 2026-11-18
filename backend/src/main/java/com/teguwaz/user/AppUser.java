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
        Instant createdAt,
        Instant updatedAt) {

    public AppUser withProfile(String displayName, String preferredLanguage) {
        return new AppUser(id, subject, email, displayName, preferredLanguage, createdAt, Instant.now());
    }
}
