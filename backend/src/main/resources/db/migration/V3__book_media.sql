-- Photos uploaded straight into a book from the device (not part of any memory).
CREATE TABLE book_media (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id      UUID         NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    object_key   VARCHAR(500) NOT NULL UNIQUE,
    content_type VARCHAR(120) NOT NULL,
    size_bytes   BIGINT       NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX book_media_book_idx ON book_media (book_id, created_at);
