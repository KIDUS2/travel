package com.teguwaz.memory;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.teguwaz.media.MediaKind;

class MediaRulesTest {

    @Test
    void contentTypesMapToKinds() {
        assertThat(MediaKind.fromContentType("image/jpeg")).contains(MediaKind.PHOTO);
        assertThat(MediaKind.fromContentType("video/mp4")).contains(MediaKind.VIDEO);
        assertThat(MediaKind.fromContentType("audio/webm")).contains(MediaKind.AUDIO);
    }

    @Test
    void otherContentTypesAreRejected() {
        assertThat(MediaKind.fromContentType("application/pdf")).isEmpty();
        assertThat(MediaKind.fromContentType("text/html")).isEmpty();
        assertThat(MediaKind.fromContentType(null)).isEmpty();
    }
}
