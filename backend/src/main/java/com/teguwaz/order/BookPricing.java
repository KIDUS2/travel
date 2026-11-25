package com.teguwaz.order;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Component;

import com.teguwaz.common.BadRequestException;

/**
 * Price of a printed book: a base price per size (covers the minimum pages), extra pages beyond that,
 * the cover finish, times copies, plus one delivery fee. Printed pages are rounded up to an even number.
 */
@Component
public class BookPricing {

    public enum Delivery { PICKUP, ADDIS, REGIONAL }

    public record Quote(int designedPages, int printedPages, int copies, BigDecimal unitPrice, BigDecimal deliveryFee,
                        BigDecimal total, String currency) {
    }

    private final PrintingProperties props;

    public BookPricing(PrintingProperties props) {
        this.props = props;
    }

    public Quote quote(String size, String finish, int designedPages, int copies, Delivery delivery) {
        if (copies < 1 || copies > 50) {
            throw new BadRequestException("Copies must be between 1 and 50");
        }
        if (designedPages > props.maxPages()) {
            throw new BadRequestException("Books can have at most " + props.maxPages() + " pages");
        }
        BigDecimal base = price(props.basePrice(), size, "size");
        BigDecimal perPage = price(props.extraPagePrice(), size, "size");
        BigDecimal finishPrice = price(props.finishPrice(), finish, "finish");
        BigDecimal deliveryFee = price(props.deliveryFee(), delivery.name(), "delivery");

        int printed = Math.max(props.minPages(), designedPages + (designedPages % 2));
        int extra = Math.max(0, printed - props.minPages());
        BigDecimal unit = base.add(finishPrice).add(perPage.multiply(BigDecimal.valueOf(extra))).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = unit.multiply(BigDecimal.valueOf(copies)).add(deliveryFee).setScale(2, RoundingMode.HALF_UP);
        return new Quote(designedPages, printed, copies, unit, deliveryFee.setScale(2, RoundingMode.HALF_UP), total, "ETB");
    }

    private static BigDecimal price(java.util.Map<String, BigDecimal> table, String key, String what) {
        BigDecimal p = key == null ? null : table.get(key);
        if (p == null) {
            throw new BadRequestException("No printing price for " + what + " '" + key + "'");
        }
        return p;
    }
}
