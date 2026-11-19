-- Feature 3: photo books built from memories.
-- Pages are stored as a JSON array; each page has a layout, a background and
-- slots (text, or a reference to a memory_media id), edited in the book editor.

CREATE TABLE books (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    trip_id    UUID         REFERENCES trips (id) ON DELETE SET NULL,
    title      VARCHAR(160) NOT NULL,
    book_type  VARCHAR(20)  NOT NULL,                 -- classic | journal | atlas | mini | custom
    settings   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    pages      JSONB        NOT NULL DEFAULT '[]'::jsonb,
    status     VARCHAR(20)  NOT NULL DEFAULT 'DRAFT', -- DRAFT | ORDERED
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT books_type_ck CHECK (book_type IN ('classic', 'journal', 'atlas', 'mini', 'custom')),
    CONSTRAINT books_status_ck CHECK (status IN ('DRAFT', 'ORDERED')),
    CONSTRAINT books_pages_array_ck CHECK (jsonb_typeof(pages) = 'array'),
    CONSTRAINT books_settings_object_ck CHECK (jsonb_typeof(settings) = 'object')
);
CREATE INDEX books_user_idx ON books (user_id, updated_at DESC);
