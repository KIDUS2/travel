package com.teguwaz.media;

import java.util.Optional;

public enum MediaKind {
    PHOTO,
    VIDEO,
    AUDIO;

    /** Maps a content type such as {@code image/jpeg} to a kind, or empty if not allowed. */
    public static Optional<MediaKind> fromContentType(String contentType) {
        if (contentType == null) {
            return Optional.empty();
        }
        String ct = contentType.toLowerCase();
        if (ct.startsWith("image/")) {
            return Optional.of(PHOTO);
        }
        if (ct.startsWith("video/")) {
            return Optional.of(VIDEO);
        }
        if (ct.startsWith("audio/")) {
            return Optional.of(AUDIO);
        }
        return Optional.empty();
    }
}
