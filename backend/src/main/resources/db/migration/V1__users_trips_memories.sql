-- Feature 1: accounts, trips, memories and their media

CREATE TABLE app_users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject            VARCHAR(255) NOT NULL UNIQUE,      -- Keycloak "sub"
    email              VARCHAR(320),
    display_name       VARCHAR(120),
    preferred_language VARCHAR(5)   NOT NULL DEFAULT 'en', -- 'en' | 'am'
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE trips (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    name        VARCHAR(160) NOT NULL,
    description TEXT,
    start_date  DATE,
    end_date    DATE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT trips_dates_ck CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX trips_user_idx ON trips (user_id, start_date DESC);

CREATE TABLE memories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    trip_id     UUID         REFERENCES trips (id) ON DELETE SET NULL,
    client_id   UUID,                                   -- set by offline clients, makes create idempotent
    title       VARCHAR(200) NOT NULL,
    story       TEXT,
    place_name  VARCHAR(200),
    region_code VARCHAR(10),                            -- ISO 3166-2, e.g. ET-AM
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    happened_at TIMESTAMPTZ  NOT NULL,
    privacy     VARCHAR(10)  NOT NULL DEFAULT 'PRIVATE', -- PRIVATE | FAMILY | PUBLIC
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT memories_privacy_ck CHECK (privacy IN ('PRIVATE', 'FAMILY', 'PUBLIC')),
    CONSTRAINT memories_lat_ck CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT memories_lng_ck CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT memories_client_uq UNIQUE (user_id, client_id)
);
CREATE INDEX memories_user_idx ON memories (user_id, happened_at DESC);
CREATE INDEX memories_trip_idx ON memories (trip_id, happened_at);

CREATE TABLE memory_media (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id    UUID         NOT NULL REFERENCES memories (id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    kind         VARCHAR(10)  NOT NULL,                 -- PHOTO | VIDEO | AUDIO
    object_key   VARCHAR(500) NOT NULL UNIQUE,
    content_type VARCHAR(120) NOT NULL,
    size_bytes   BIGINT       NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT memory_media_kind_ck CHECK (kind IN ('PHOTO', 'VIDEO', 'AUDIO'))
);
CREATE INDEX memory_media_memory_idx ON memory_media (memory_id, sort_order);
