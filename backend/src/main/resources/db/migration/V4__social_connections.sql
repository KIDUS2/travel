-- Feature 4: connected social accounts (YouTube first, then Instagram and TikTok).
-- Tokens are encrypted by the application (AES-GCM) before they are stored.
CREATE TABLE social_connections (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    platform         VARCHAR(20)  NOT NULL,           -- youtube | instagram | tiktok
    account_id       VARCHAR(200) NOT NULL,
    account_name     VARCHAR(200),
    access_token     TEXT         NOT NULL,
    refresh_token    TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes           TEXT,
    connected_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_synced_at   TIMESTAMPTZ,
    CONSTRAINT social_connections_platform_ck CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
    CONSTRAINT social_connections_user_platform_uq UNIQUE (user_id, platform)
);
