package com.teguwaz.connection;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teguwaz.channel.ChannelService;

class SocialClientsTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void readsTikTokProfileAndVideos() throws Exception {
        var profile = TikTokClient.parseProfile(json.readTree("""
                {"data":{"user":{"open_id":"oid1","display_name":"Bibi","username":"bibisha","avatar_url":"https://p16/a.jpg",
                 "follower_count":1200,"following_count":80,"likes_count":45000,"video_count":31}},"error":{"code":"ok"}}"""));
        assertThat(profile.handle()).isEqualTo("@bibisha");
        assertThat(profile.followers()).isEqualTo(1200L);
        assertThat(profile.totalLikes()).isEqualTo(45000L);

        var videos = TikTokClient.parseVideos(json.readTree("""
                {"data":{"videos":[{"id":"v1","title":"","video_description":"Lalibela sunrise #ethiopia","create_time":1763600000,
                 "share_url":"https://www.tiktok.com/@bibisha/video/v1","view_count":10000,"like_count":900,"comment_count":50,"share_count":50}],
                 "has_more":false},"error":{"code":"ok"}}"""));
        assertThat(videos).hasSize(1);
        assertThat(videos.get(0).title()).isEqualTo("Lalibela sunrise #ethiopia");
        assertThat(videos.get(0).publishedAt()).startsWith("2025-");

        var stats = ChannelService.toSocialStats("tiktok", profile, videos);
        assertThat(stats.recentViews()).isEqualTo(10000L);
        assertThat(stats.engagementRate()).isEqualTo(10.0); // (900 + 50 + 50) / 10000
    }

    @Test
    void readsInstagramProfileAndPostsWithoutViews() throws Exception {
        var profile = InstagramClient.parseProfile(json.readTree("""
                {"user_id":"178","username":"bibi.travels","name":"Bibi","followers_count":2000,"follows_count":150,"media_count":64}"""));
        assertThat(profile.profileUrl()).isEqualTo("https://www.instagram.com/bibi.travels/");
        var posts = InstagramClient.parsePosts(json.readTree("""
                {"data":[{"id":"1","caption":"Simien Mountains\\nday 2","media_type":"IMAGE","permalink":"https://www.instagram.com/p/1/",
                  "media_url":"https://x/1.jpg","timestamp":"2026-11-01T08:00:00+0000","like_count":150,"comments_count":10},
                 {"id":"2","media_type":"VIDEO","permalink":"https://www.instagram.com/reel/2/","thumbnail_url":"https://x/2.jpg",
                  "timestamp":"2026-11-03T08:00:00+0000","like_count":50,"comments_count":10}]}"""));
        assertThat(posts.get(0).title()).isEqualTo("Simien Mountains");
        assertThat(posts.get(1).title()).isEqualTo("Reel");
        assertThat(posts.get(1).thumbnailUrl()).isEqualTo("https://x/2.jpg");

        var stats = ChannelService.toSocialStats("instagram", profile, posts);
        assertThat(stats.recentViews()).isNull();
        assertThat(stats.engagementRate()).isEqualTo(5.5); // (200 + 20) / 2 posts / 2000 followers
        assertThat(stats.note()).contains("per post");
    }

    @Test
    void emptyAccountsHaveNoEngagement() {
        var p = new SocialProfile("1", "New", "@new", null, null, 0L, 0L, null, 0L);
        assertThat(ChannelService.toSocialStats("instagram", p, List.of()).engagementRate()).isNull();
    }
}
