package com.teguwaz.order;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Printing prices in Ethiopian birr, set per printing partner in application.yml. */
@ConfigurationProperties(prefix = "teguwaz.printing")
public record PrintingProperties(
        int minPages,
        int maxPages,
        String pickupAddress,
        Map<String, BigDecimal> basePrice,
        Map<String, BigDecimal> extraPagePrice,
        Map<String, BigDecimal> finishPrice,
        Map<String, BigDecimal> deliveryFee) {

    public PrintingProperties {
        minPages = minPages <= 0 ? 20 : minPages;
        maxPages = maxPages <= 0 ? 120 : maxPages;
        basePrice = basePrice == null ? Map.of() : basePrice;
        extraPagePrice = extraPagePrice == null ? Map.of() : extraPagePrice;
        finishPrice = finishPrice == null ? Map.of() : finishPrice;
        deliveryFee = deliveryFee == null ? Map.of() : deliveryFee;
    }
}
