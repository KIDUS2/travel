package com.teguwaz.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.order.BookPricing.Delivery;

class BookPricingTest {

    private final PrintingProperties props = new PrintingProperties(20, 120, "Bole",
            Map.of("a4-landscape", new BigDecimal("1800"), "a5-portrait", new BigDecimal("950")),
            Map.of("a4-landscape", new BigDecimal("40"), "a5-portrait", new BigDecimal("25")),
            Map.of("hard", new BigDecimal("600"), "soft", BigDecimal.ZERO),
            Map.of("PICKUP", BigDecimal.ZERO, "ADDIS", new BigDecimal("250"), "REGIONAL", new BigDecimal("600")));
    private final BookPricing pricing = new BookPricing(props);

    @Test
    void shortBooksPayTheMinimumAndPagesRoundUpToEven() {
        var q = pricing.quote("a4-landscape", "hard", 9, 1, Delivery.PICKUP);
        assertThat(q.printedPages()).isEqualTo(20);
        assertThat(q.total()).isEqualByComparingTo("2400");

        var longer = pricing.quote("a4-landscape", "soft", 25, 2, Delivery.ADDIS);
        assertThat(longer.printedPages()).isEqualTo(26);
        assertThat(longer.unitPrice()).isEqualByComparingTo("2040"); // 1800 + 6 × 40
        assertThat(longer.total()).isEqualByComparingTo("4330");     // 2 × 2040 + 250
    }

    @Test
    void rejectsUnknownOptionsAndTooManyCopies() {
        assertThatThrownBy(() -> pricing.quote("poster", "hard", 10, 1, Delivery.PICKUP)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> pricing.quote("a5-portrait", "soft", 10, 51, Delivery.PICKUP)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> pricing.quote("a5-portrait", "soft", 121, 1, Delivery.PICKUP)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void normalizesEthiopianPhones() {
        assertThat(EthiopianPhone.normalize("0911 23 45 67")).isEqualTo("0911234567");
        assertThat(EthiopianPhone.normalize("+251 911 234 567")).isEqualTo("0911234567");
        assertThat(EthiopianPhone.normalize("711234567")).isEqualTo("0711234567");
        assertThat(EthiopianPhone.normalize("0111234567")).isNull();
        assertThat(EthiopianPhone.normalize("12345")).isNull();
    }

    @Test
    void readsChapaVerification() throws Exception {
        var json = new ObjectMapper();
        var ok = ChapaClient.parseVerification(json.readTree("""
                {"message":"Payment details","status":"success","data":{"status":"success","amount":"2400.00","currency":"ETB","reference":"APfxXyz","method":"telebirr"}}"""));
        assertThat(ok.paid()).isTrue();
        assertThat(ok.amount()).isEqualByComparingTo("2400");
        assertThat(ok.method()).isEqualTo("telebirr");
        var pending = ChapaClient.parseVerification(json.readTree("""
                {"status":"success","data":{"status":"pending","amount":"2400"}}"""));
        assertThat(pending.paid()).isFalse();
    }

    @Test
    void splitsNamesForCheckout() {
        assertThat(OrderService.splitName("Kidus  Tewahade Tadesse")).containsExactly("Kidus", "Tewahade Tadesse");
        assertThat(OrderService.splitName("Meron")).containsExactly("Meron", "Meron");
    }
}
