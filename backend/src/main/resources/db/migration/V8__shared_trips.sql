-- Feature: shared trips. Friends and family join a trip by invite link and add their own memories.
CREATE TABLE trip_members (
    trip_id   UUID        NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    role      VARCHAR(10) NOT NULL,                  -- EDITOR adds memories · VIEWER only looks
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, user_id),
    CONSTRAINT trip_members_role_ck CHECK (role IN ('EDITOR', 'VIEWER'))
);
CREATE INDEX trip_members_user_idx ON trip_members (user_id);

CREATE TABLE trip_invites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id    UUID        NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,           -- SHA-256 of the link token; the token itself is never stored
    role       VARCHAR(10) NOT NULL,
    created_by UUID        NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    uses       INT         NOT NULL DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT trip_invites_role_ck CHECK (role IN ('EDITOR', 'VIEWER'))
);
CREATE INDEX trip_invites_trip_idx ON trip_invites (trip_id, created_at DESC);
