package com.teguwaz.channel;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.teguwaz.connection.YouTubeClient.Day;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ChannelDtos {

    private ChannelDtos() {
    }

    public static final String PLATFORMS = "youtube|tiktok|instagram|facebook|x|telegram|website|other";

    /** What the user types: which platform, the channel's name and its link. */
    public record ChannelRequest(
            @NotBlank @Pattern(regexp = PLATFORMS, message = "unknown platform") String platform,
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Size(max = 500) String url) {
    }

    public record ChannelResponse(
            UUID id,
            String platform,
            String name,
            String url,
            boolean statsSupported,
            boolean statsAvailable,
            boolean connected,
            String accountName,
            Instant connectedAt,
            Instant lastSyncedAt,
            Instant createdAt) {
    }

    /** Platforms the user can pick, and whether stats can be connected on this server. */
    public record PlatformInfo(String id, String name, boolean statsSupported, boolean statsAvailable, String setup) {
    }

    public record StartResponse(String authorizeUrl) {
    }

    public record YouTubeStats(
            String channelTitle,
            long subscribers,
            long totalViews,
            long videoCount,
            int periodDays,
            long periodViews,
            long periodLikes,
            long periodComments,
            long periodShares,
            long subscribersGained,
            double engagementRate,
            boolean analyticsAvailable,
            String note,
            List<Day> days) {
    }
}
