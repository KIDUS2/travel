package com.teguwaz.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import io.r2dbc.postgresql.codec.Json;

@Table("book_orders")
public record BookOrder(
        @Id UUID id,
        UUID userId,
        UUID bookId,
        String bookTitle,
        Json snapshot,
        String size,
        String finish,
        int printedPages,
        int copies,
        BigDecimal unitPriceEtb,
        BigDecimal deliveryFeeEtb,
        BigDecimal totalEtb,
        String deliveryMethod,
        String recipientName,
        String phone,
        String city,
        String address,
        String notes,
        String status,
        String txRef,
        String paymentReference,
        String paymentMethod,
        String checkoutUrl,
        Instant paidAt,
        String adminNote,
        Instant createdAt,
        Instant updatedAt) {

    public static final String PENDING = "PENDING_PAYMENT";
    public static final String PAID = "PAID";

    public BookOrder withCheckout(String url) {
        return new BookOrder(id, userId, bookId, bookTitle, snapshot, size, finish, printedPages, copies, unitPriceEtb, deliveryFeeEtb,
                totalEtb, deliveryMethod, recipientName, phone, city, address, notes, status, txRef, paymentReference, paymentMethod,
                url, paidAt, adminNote, createdAt, Instant.now());
    }

    public BookOrder paid(String reference, String method) {
        return new BookOrder(id, userId, bookId, bookTitle, snapshot, size, finish, printedPages, copies, unitPriceEtb, deliveryFeeEtb,
                totalEtb, deliveryMethod, recipientName, phone, city, address, notes, PAID, txRef, reference, method,
                checkoutUrl, Instant.now(), adminNote, createdAt, Instant.now());
    }

    public BookOrder withStatus(String newStatus, String note) {
        return new BookOrder(id, userId, bookId, bookTitle, snapshot, size, finish, printedPages, copies, unitPriceEtb, deliveryFeeEtb,
                totalEtb, deliveryMethod, recipientName, phone, city, address, notes, newStatus, txRef, paymentReference, paymentMethod,
                checkoutUrl, paidAt, note == null ? adminNote : note, createdAt, Instant.now());
    }
}
