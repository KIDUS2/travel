package com.teguwaz.connection;

/** An account's public profile numbers. Null = the platform does not report it. */
public record SocialProfile(String accountId, String name, String handle, String avatarUrl, String profileUrl,
                            Long followers, Long following, Long totalLikes, Long posts) {
}
