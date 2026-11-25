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
    public record PlatformInfo(String id, String name, boolean statsSupported, boolean statsAvailable,
                               boolean publicStatsAvailable, String setup) {
    }

    /** Real public numbers for a YouTube channel, read with the server's API key. */
    public record PublicStats(
            String channelId,
            String title,
            String handle,
            String thumbnailUrl,
            long subscribers,
            boolean subscribersHidden,
            long totalViews,
            long videoCount,
            String createdAt,
            List<com.teguwaz.connection.YouTubeClient.Video> latestVideos,
            Instant fetchedAt) {
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

    /** TikTok or Instagram numbers for a connected account: profile counts plus totals over recent posts. */
    public record SocialStats(
            String platform,
            String accountName,
            String handle,
            String avatarUrl,
            String profileUrl,
            Long followers,
            Long following,
            Long totalLikes,
            Long posts,
            int recentCount,
            Long recentViews,
            long recentLikes,
            long recentComments,
            Long recentShares,
            Double engagementRate,
            java.util.List<com.teguwaz.connection.SocialPost> recentPosts,
            java.time.Instant fetchedAt,
            String note) {
    }
}
