package com.teguwaz.channel;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Which YouTube channel a link points to, in a form the YouTube Data API can look up:
 * <ul>
 *   <li>{@code youtube.com/@name} → handle</li>
 *   <li>{@code youtube.com/channel/UC…} → channel id</li>
 *   <li>{@code youtube.com/user/name} → legacy username</li>
 * </ul>
 * Custom {@code /c/name} links can't be resolved without a costly search, so we ask for the @handle instead.
 */
public record YouTubeChannelRef(Kind kind, String value) {

    public enum Kind { HANDLE, ID, USERNAME }

    public static Optional<YouTubeChannelRef> parse(String url) {
        if (url == null) {
            return Optional.empty();
        }
        String raw = url.trim();
        if (raw.startsWith("@")) {
            return handle(raw);
        }
        if (!raw.matches("(?i)^https?://.*")) {
            raw = "https://" + raw;
        }
        URI uri;
        try {
            uri = URI.create(raw);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (!(host.equals("youtube.com") || host.endsWith(".youtube.com"))) {
            return Optional.empty();
        }
        String path = uri.getRawPath() == null ? "" : URLDecoder.decode(uri.getRawPath(), StandardCharsets.UTF_8);
        String[] parts = path.replaceFirst("^/", "").split("/");
        if (parts.length == 0 || parts[0].isEmpty()) {
            return Optional.empty();
        }
        if (parts[0].startsWith("@")) {
            return handle(parts[0]);
        }
        if (parts.length >= 2 && parts[0].equalsIgnoreCase("channel") && parts[1].matches("UC[\\w-]{20,}")) {
            return Optional.of(new YouTubeChannelRef(Kind.ID, parts[1]));
        }
        if (parts.length >= 2 && parts[0].equalsIgnoreCase("user") && parts[1].matches("[\\w.-]{1,100}")) {
            return Optional.of(new YouTubeChannelRef(Kind.USERNAME, parts[1]));
        }
        return Optional.empty();
    }

    private static Optional<YouTubeChannelRef> handle(String h) {
        String name = h.substring(1);
        return name.matches("[\\w.\\-·]{3,100}") ? Optional.of(new YouTubeChannelRef(Kind.HANDLE, "@" + name)) : Optional.empty();
    }
}
