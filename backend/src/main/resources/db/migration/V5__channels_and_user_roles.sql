-- Channels: any number per user and per platform, added by the user with a name
-- and a link. Some (YouTube today) can also be connected for stats via OAuth.
CREATE TABLE channels (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    platform         VARCHAR(20)  NOT NULL,
    name             VARCHAR(160) NOT NULL,
    url              VARCHAR(500) NOT NULL,
    account_id       VARCHAR(200),               -- set once connected for stats
    account_name     VARCHAR(200),
    access_token     TEXT,                       -- encrypted (AES-GCM) by the application
    refresh_token    TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes           TEXT,
    connected_at     TIMESTAMPTZ,
    last_synced_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT channels_platform_ck CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'facebook', 'x', 'telegram', 'website', 'other'))
);
CREATE INDEX channels_user_idx ON channels (user_id, created_at);
CREATE UNIQUE INDEX channels_account_uq ON channels (user_id, platform, account_id) WHERE account_id IS NOT NULL;

-- Keep anything connected with the earlier one-per-platform table.
INSERT INTO channels (user_id, platform, name, url, account_id, account_name, access_token, refresh_token,
                      token_expires_at, scopes, connected_at, last_synced_at)
SELECT user_id, platform, COALESCE(account_name, platform),
       CASE WHEN platform = 'youtube' THEN 'https://www.youtube.com/channel/' || account_id ELSE 'https://' || platform || '.com' END,
       account_id, account_name, access_token, refresh_token, token_expires_at, scopes, connected_at, last_synced_at
FROM social_connections;
DROP TABLE social_connections;

-- User management
ALTER TABLE app_users ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'USER';
ALTER TABLE app_users ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE app_users ADD COLUMN last_seen_at TIMESTAMPTZ;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_ck CHECK (role IN ('USER', 'ADMIN'));
ALTER TABLE app_users ADD CONSTRAINT app_users_status_ck CHECK (status IN ('ACTIVE', 'SUSPENDED'));
