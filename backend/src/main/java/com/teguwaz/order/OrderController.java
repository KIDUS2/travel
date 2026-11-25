package com.teguwaz.order;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.order.BookPricing.Delivery;
import com.teguwaz.order.BookPricing.Quote;
import com.teguwaz.order.OrderDtos.CreateOrderRequest;
import com.teguwaz.order.OrderDtos.CreatedOrder;
import com.teguwaz.order.OrderDtos.OrderResponse;
import com.teguwaz.order.OrderDtos.PrintingInfo;
import com.teguwaz.order.OrderDtos.StatusUpdate;
import com.teguwaz.user.CurrentUserService;

import jakarta.validation.Valid;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
public class OrderController {

    private final CurrentUserService currentUser;
    private final OrderService orders;

    public OrderController(CurrentUserService currentUser, OrderService orders) {
        this.currentUser = currentUser;
        this.orders = orders;
    }

    @GetMapping("/api/printing")
    public Mono<PrintingInfo> info() {
        return currentUser.currentUserId().map(id -> orders.info());
    }

    @GetMapping("/api/books/{bookId}/quote")
    public Mono<Quote> quote(@PathVariable UUID bookId, @RequestParam(defaultValue = "1") int copies,
                             @RequestParam(defaultValue = "PICKUP") Delivery delivery) {
        return currentUser.currentUserId().flatMap(id -> orders.quote(id, bookId, copies, delivery));
    }

    @PostMapping("/api/books/{bookId}/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<CreatedOrder> create(@PathVariable UUID bookId, @Valid @RequestBody CreateOrderRequest req) {
        return currentUser.currentUser().flatMap(u -> orders.create(u, bookId, req));
    }

    @GetMapping("/api/orders")
    public Flux<OrderResponse> mine() {
        return currentUser.currentUserId().flatMapMany(orders::mine);
    }

    @GetMapping("/api/orders/{id}")
    public Mono<OrderResponse> get(@PathVariable UUID id) {
        return currentUser.currentUserId().flatMap(u -> orders.get(u, id));
    }

    /** Chapa's callback after payment (GET with trx_ref, or POST). Public; payment is verified with Chapa. */
    @RequestMapping(value = "/api/orders/chapa/callback", method = {RequestMethod.GET, RequestMethod.POST})
    public Mono<String> chapaCallback(@RequestParam(name = "trx_ref", required = false) String trxRef,
                                      @RequestParam(name = "tx_ref", required = false) String txRef) {
        return orders.callback(trxRef != null ? trxRef : txRef).thenReturn("ok");
    }

    @GetMapping("/api/admin/orders")
    public Flux<OrderResponse> all(@RequestParam(required = false) String status) {
        return currentUser.requireAdmin().flatMapMany(a -> orders.all(status));
    }

    @PatchMapping("/api/admin/orders/{id}")
    public Mono<OrderResponse> update(@PathVariable UUID id, @Valid @RequestBody StatusUpdate body) {
        return currentUser.requireAdmin().flatMap(a -> orders.updateStatus(id, body.status(), body.note()));
    }
}
