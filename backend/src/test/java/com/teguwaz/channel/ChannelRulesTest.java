package com.teguwaz.channel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.teguwaz.common.BadRequestException;

class ChannelRulesTest {

    @Test
    void linksAreNormalisedToHttps() {
        assertThat(ChannelService.normalizeUrl("youtube.com/@merontravels")).isEqualTo("https://youtube.com/@merontravels");
        assertThat(ChannelService.normalizeUrl("http://t.me/teguwaz")).isEqualTo("https://t.me/teguwaz");
        assertThat(ChannelService.normalizeUrl(" https://www.tiktok.com/@meron.ethiopia ")).isEqualTo("https://www.tiktok.com/@meron.ethiopia");
    }

    @Test
    void badLinksAreRejected() {
        assertThatThrownBy(() -> ChannelService.normalizeUrl("javascript:alert(1)")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> ChannelService.normalizeUrl("not a link")).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> ChannelService.normalizeUrl("localhost")).isInstanceOf(BadRequestException.class);
    }

    @Test
    void onlyYouTubeSupportsStatsToday() {
        assertThat(ChannelService.statsSupported("youtube")).isTrue();
        assertThat(ChannelService.statsSupported("tiktok")).isFalse();
        assertThat(ChannelService.statsSupported("website")).isFalse();
    }
}
