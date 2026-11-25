-- Feature: printed book orders, paid through Chapa (telebirr, CBE Birr, bank, card).
CREATE TABLE book_orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID          REFERENCES app_users (id) ON DELETE SET NULL, -- kept, anonymized, as a payment record
    book_id           UUID          REFERENCES books (id) ON DELETE SET NULL,
    book_title        VARCHAR(160)  NOT NULL,
    snapshot          JSONB         NOT NULL,          -- settings + pages exactly as ordered
    size              VARCHAR(20)   NOT NULL,
    finish            VARCHAR(10)   NOT NULL,
    printed_pages     INT           NOT NULL,
    copies            INT           NOT NULL,
    unit_price_etb    NUMERIC(12,2) NOT NULL,
    delivery_fee_etb  NUMERIC(12,2) NOT NULL,
    total_etb         NUMERIC(12,2) NOT NULL,
    delivery_method   VARCHAR(10)   NOT NULL,          -- PICKUP | ADDIS | REGIONAL
    recipient_name    VARCHAR(120)  NOT NULL,
    phone             VARCHAR(20)   NOT NULL,
    city              VARCHAR(80),
    address           VARCHAR(300),
    notes             VARCHAR(500),
    status            VARCHAR(20)   NOT NULL DEFAULT 'PENDING_PAYMENT',
    tx_ref            VARCHAR(64)   NOT NULL UNIQUE,
    payment_reference VARCHAR(120),
    payment_method    VARCHAR(40),
    checkout_url      VARCHAR(500),
    paid_at           TIMESTAMPTZ,
    admin_note        VARCHAR(500),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT book_orders_status_ck CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'PRINTING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED')),
    CONSTRAINT book_orders_delivery_ck CHECK (delivery_method IN ('PICKUP', 'ADDIS', 'REGIONAL')),
    CONSTRAINT book_orders_copies_ck CHECK (copies BETWEEN 1 AND 50)
);
CREATE INDEX book_orders_user_idx ON book_orders (user_id, created_at DESC);
CREATE INDEX book_orders_status_idx ON book_orders (status, created_at DESC);
