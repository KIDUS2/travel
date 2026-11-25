package com.teguwaz.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record PrintingInfo(boolean paymentsAvailable, boolean testMode, String pickupAddress, int minPages, int maxPages,
                               Map<String, BigDecimal> deliveryFees) {
    }

    public record CreateOrderRequest(
            @Min(1) @Max(50) int copies,
            @NotNull BookPricing.Delivery delivery,
            @NotBlank @Size(max = 120) String recipientName,
            @NotBlank @Size(max = 20) String phone,
            @Size(max = 80) String city,
            @Size(max = 300) String address,
            @Size(max = 500) String notes) {
    }

    public record CreatedOrder(OrderResponse order, String checkoutUrl) {
    }

    public record OrderResponse(UUID id, UUID bookId, String bookTitle, String size, String finish, int printedPages, int copies,
                                BigDecimal unitPrice, BigDecimal deliveryFee, BigDecimal total, String currency,
                                String deliveryMethod, String recipientName, String phone, String city, String address, String notes,
                                String status, String paymentReference, String paymentMethod, String checkoutUrl, Instant paidAt,
                                String adminNote, Instant createdAt) {

        static OrderResponse from(BookOrder o) {
            return new OrderResponse(o.id(), o.bookId(), o.bookTitle(), o.size(), o.finish(), o.printedPages(), o.copies(),
                    o.unitPriceEtb(), o.deliveryFeeEtb(), o.totalEtb(), "ETB", o.deliveryMethod(), o.recipientName(), o.phone(),
                    o.city(), o.address(), o.notes(), o.status(), o.paymentReference(), o.paymentMethod(),
                    BookOrder.PENDING.equals(o.status()) ? o.checkoutUrl() : null, o.paidAt(), o.adminNote(), o.createdAt());
        }
    }

    public record StatusUpdate(@NotBlank String status, @Size(max = 500) String note) {
    }
}
