package com.teguwaz.order;

import java.math.BigDecimal;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.teguwaz.common.BadRequestException;

import reactor.core.publisher.Mono;

/**
 * Chapa hosted checkout. We never trust what the browser or a callback says about a payment:
 * the order is marked paid only after {@link #verify} confirms it with Chapa.
 */
@Component
public class ChapaClient {

    public record Checkout(String txRef, BigDecimal amount, String email, String firstName, String lastName, String phone,
                           String callbackUrl, String returnUrl, String description) {
    }

    public record Verification(boolean paid, BigDecimal amount, String currency, String reference, String method) {
    }

    private final WebClient http;
    private final ChapaProperties props;

    public ChapaClient(WebClient.Builder builder, ChapaProperties props) {
        this.http = builder.build();
        this.props = props;
    }

    /** Returns the checkout page URL to send the traveler to. */
    public Mono<String> initialize(Checkout c) {
        ObjectNode body = JsonNodeFactory.instance.objectNode();
        body.put("amount", c.amount().toPlainString());
        body.put("currency", "ETB");
        body.put("tx_ref", c.txRef());
        body.put("callback_url", c.callbackUrl());
        body.put("return_url", c.returnUrl());
        if (c.email() != null && !c.email().isBlank()) {
            body.put("email", c.email());
        }
        body.put("first_name", c.firstName());
        body.put("last_name", c.lastName());
        body.put("phone_number", c.phone());
        body.put("customization[title]", "Teguwaz book");
        body.put("customization[description]", c.description());
        return http.post().uri(props.baseUrl() + "/v1/transaction/initialize")
                .headers(h -> h.setBearerAuth(props.secretKey()))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .onErrorMap(WebClientResponseException.class, e -> new BadRequestException("Payment could not start: " + message(e)))
                .flatMap(n -> {
                    String url = n.path("data").path("checkout_url").asText("");
                    return url.isEmpty()
                            ? Mono.error(new BadRequestException("Payment could not start: " + n.path("message").asText("no checkout link")))
                            : Mono.just(url);
                });
    }

    public Mono<Verification> verify(String txRef) {
        return http.get().uri(props.baseUrl() + "/v1/transaction/verify/{ref}", txRef)
                .headers(h -> h.setBearerAuth(props.secretKey()))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(ChapaClient::parseVerification)
                // Chapa answers 4xx for payments that are not completed yet.
                .onErrorResume(WebClientResponseException.class, e -> e.getStatusCode().is4xxClientError()
                        ? Mono.just(new Verification(false, null, null, null, null))
                        : Mono.error(e));
    }

    static Verification parseVerification(JsonNode n) {
        JsonNode d = n.path("data");
        boolean paid = "success".equalsIgnoreCase(n.path("status").asText()) && "success".equalsIgnoreCase(d.path("status").asText());
        BigDecimal amount = d.hasNonNull("amount") ? new BigDecimal(d.path("amount").asText("0")) : null;
        return new Verification(paid, amount, d.path("currency").asText(null), d.path("reference").asText(null), d.path("method").asText(null));
    }

    private static String message(WebClientResponseException e) {
        String body = e.getResponseBodyAsString();
        return body == null || body.isBlank() ? e.getStatusText() : body.length() > 200 ? body.substring(0, 200) : body;
    }
}
