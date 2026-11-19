package com.teguwaz.channel;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.teguwaz.channel.YouTubeChannelRef.Kind;

class YouTubeChannelRefTest {

    @Test
    void readsHandlesIncludingDotsAndDashes() {
        assertThat(YouTubeChannelRef.parse("https://www.youtube.com/@Bibisha.12-f2z"))
                .contains(new YouTubeChannelRef(Kind.HANDLE, "@Bibisha.12-f2z"));
        assertThat(YouTubeChannelRef.parse("youtube.com/@merontravels/videos"))
                .contains(new YouTubeChannelRef(Kind.HANDLE, "@merontravels"));
        assertThat(YouTubeChannelRef.parse("https://m.youtube.com/@meron?si=abc"))
                .contains(new YouTubeChannelRef(Kind.HANDLE, "@meron"));
        assertThat(YouTubeChannelRef.parse("@meron")).contains(new YouTubeChannelRef(Kind.HANDLE, "@meron"));
    }

    @Test
    void readsChannelIdsAndLegacyUsernames() {
        assertThat(YouTubeChannelRef.parse("https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"))
                .contains(new YouTubeChannelRef(Kind.ID, "UC_x5XG1OV2P6uZZ5FSM9Ttw"));
        assertThat(YouTubeChannelRef.parse("https://www.youtube.com/user/GoogleDevelopers"))
                .contains(new YouTubeChannelRef(Kind.USERNAME, "GoogleDevelopers"));
    }

    @Test
    void rejectsOtherLinks() {
        assertThat(YouTubeChannelRef.parse("https://www.tiktok.com/@meron")).isEmpty();
        assertThat(YouTubeChannelRef.parse("https://www.youtube.com/watch?v=abc")).isEmpty();
        assertThat(YouTubeChannelRef.parse("https://www.youtube.com/c/SomeName")).isEmpty();
        assertThat(YouTubeChannelRef.parse("https://evil-youtube.com/@x")).isEmpty();
    }
}
