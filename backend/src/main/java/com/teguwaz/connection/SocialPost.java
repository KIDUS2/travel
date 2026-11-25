package com.teguwaz.connection;

/** One recent post or video on TikTok or Instagram, with the counts the platform shares. Null = not reported. */
public record SocialPost(String id, String title, String url, String thumbnailUrl, String publishedAt,
                         Long views, Long likes, Long comments, Long shares) {
}
