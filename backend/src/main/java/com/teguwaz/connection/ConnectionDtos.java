package com.teguwaz.connection;

import java.time.Instant;
import java.util.List;

import com.teguwaz.connection.YouTubeClient.Day;

public final class ConnectionDtos {

    private ConnectionDtos() {
    }

    /** One platform as the Creator studio shows it. */
    public record ConnectionStatus(
            String platform,
            boolean available,
            boolean connected,
            String accountName,
            Instant connectedAt,
            Instant lastSyncedAt,
            String setup) {
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
