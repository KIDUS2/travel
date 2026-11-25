package com.teguwaz.order;

import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.teguwaz.book.Book;
import com.teguwaz.book.BookRepository;
import com.teguwaz.common.BadRequestException;
import com.teguwaz.common.NotFoundException;
import com.teguwaz.connection.PlatformProperties;
import com.teguwaz.order.BookPricing.Delivery;
import com.teguwaz.order.BookPricing.Quote;
import com.teguwaz.order.OrderDtos.CreateOrderRequest;
import com.teguwaz.order.OrderDtos.CreatedOrder;
import com.teguwaz.order.OrderDtos.OrderResponse;
import com.teguwaz.order.OrderDtos.PrintingInfo;
import com.teguwaz.user.AppUser;

import io.r2dbc.postgresql.codec.Json;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** Printed book orders: price, pay with Chapa, verify, then the print team moves it along. */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    static final Set<String> ADMIN_STATUSES = Set.of("PRINTING", "SHIPPED", "DELIVERED", "CANCELLED");

    private final BookOrderRepository orders;
    private final BookRepository books;
    private final BookPricing pricing;
    private final PrintingProperties printing;
    private final ChapaClient chapa;
    private final ChapaProperties chapaProps;
    private final PlatformProperties platform;
    private final DatabaseClient db;
    private final ObjectMapper json;
    private final com.teguwaz.storage.StorageService storage;

    public OrderService(BookOrderRepository orders, BookRepository books, BookPricing pricing, PrintingProperties printing,
                        ChapaClient chapa, ChapaProperties chapaProps, PlatformProperties platform, DatabaseClient db, ObjectMapper json,
                        com.teguwaz.storage.StorageService storage) {
        this.orders = orders;
        this.books = books;
        this.pricing = pricing;
        this.printing = printing;
        this.chapa = chapa;
        this.chapaProps = chapaProps;
        this.platform = platform;
        this.db = db;
        this.json = json;
        this.storage = storage;
    }

    public PrintingInfo info() {
        return new PrintingInfo(chapaProps.configured(), chapaProps.testMode(), printing.pickupAddress(), printing.minPages(),
                printing.maxPages(), printing.deliveryFee());
    }

    record BookFacts(Book book, String size, String finish, int designedPages, JsonNode settings, JsonNode pages) {
    }

    private Mono<BookFacts> facts(UUID userId, UUID bookId) {
        return books.findByIdAndUserId(bookId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Book", bookId)))
                .map(b -> {
                    try {
                        JsonNode settings = json.readTree(b.settings().asString());
                        JsonNode pages = json.readTree(b.pages().asString());
                        int designed = Math.max(0, pages.size() - 1); // the first page is the cover
                        return new BookFacts(b, settings.path("size").asText("a4-landscape"), settings.path("finish").asText("hard"),
                                designed, settings, pages);
                    } catch (Exception e) {
                        throw new BadRequestException("This book could not be read");
                    }
                });
    }

    public Mono<Quote> quote(UUID userId, UUID bookId, int copies, Delivery delivery) {
        return facts(userId, bookId).map(f -> pricing.quote(f.size(), f.finish(), f.designedPages(), copies, delivery));
    }

    public Mono<CreatedOrder> create(AppUser user, UUID bookId, CreateOrderRequest req) {
        if (!chapaProps.configured()) {
            return Mono.error(new BadRequestException("Book ordering is not set up on this server yet. The server owner needs to add a Chapa key (CHAPA_SECRET_KEY)."));
        }
        String phone = EthiopianPhone.normalize(req.phone());
        if (phone == null) {
            return Mono.error(new BadRequestException("Enter an Ethiopian mobile number, like 0911 234 567"));
        }
        if (req.delivery() != Delivery.PICKUP && blank(req.address())) {
            return Mono.error(new BadRequestException("Enter the delivery address"));
        }
        if (req.delivery() == Delivery.REGIONAL && blank(req.city())) {
            return Mono.error(new BadRequestException("Enter the city for delivery"));
        }
        return facts(user.id(), bookId).flatMap(f -> {
            if (f.designedPages() < 1) {
                return Mono.error(new BadRequestException("Add at least one page after the cover before ordering"));
            }
            Quote q = pricing.quote(f.size(), f.finish(), f.designedPages(), req.copies(), req.delivery());
            ObjectNode snapshot = json.createObjectNode();
            snapshot.set("settings", f.settings());
            snapshot.set("pages", f.pages());
            String txRef = "tgz-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
            BookOrder draft = new BookOrder(null, user.id(), f.book().id(), f.book().title(), Json.of(snapshot.toString()), f.size(), f.finish(),
                    q.printedPages(), q.copies(), q.unitPrice(), q.deliveryFee(), q.total(), req.delivery().name(),
                    req.recipientName().trim(), phone, trimToNull(req.city()), trimToNull(req.address()), trimToNull(req.notes()),
                    BookOrder.PENDING, txRef, null, null, null, null, null, null, null);
            return orders.save(draft).flatMap(saved -> {
                String[] names = splitName(saved.recipientName());
                ChapaClient.Checkout checkout = new ChapaClient.Checkout(txRef, saved.totalEtb(), user.email(), names[0], names[1], phone,
                        chapaProps.backendPublicUrl() + "/api/orders/chapa/callback",
                        platform.frontendUrl().replaceAll("/+$", "") + "/orders/" + saved.id(),
                        "Printed book x" + saved.copies());
                return chapa.initialize(checkout)
                        .flatMap(url -> orders.save(saved.withCheckout(url)))
                        .map(o -> new CreatedOrder(OrderResponse.from(o), o.checkoutUrl()))
                        .onErrorResume(e -> orders.save(saved.withStatus("PAYMENT_FAILED", null)).then(Mono.error(e)));
            });
        });
    }

    public Flux<OrderResponse> mine(UUID userId) {
        return orders.findByUserIdOrderByCreatedAtDesc(userId).map(OrderResponse::from);
    }

    /** Re-checks payment with Chapa if still pending, then returns the order. */
    public Mono<OrderResponse> get(UUID userId, UUID orderId) {
        return orders.findByIdAndUserId(orderId, userId)
                .switchIfEmpty(Mono.error(new NotFoundException("Order", orderId)))
                .flatMap(this::confirmPayment)
                .map(OrderResponse::from);
    }

    /** Chapa calls this after a payment; we look the payment up ourselves instead of trusting the call. */
    public Mono<Void> callback(String txRef) {
        if (blank(txRef)) {
            return Mono.empty();
        }
        return orders.findByTxRef(txRef).flatMap(this::confirmPayment).then();
    }

    Mono<BookOrder> confirmPayment(BookOrder o) {
        if (!BookOrder.PENDING.equals(o.status()) || !chapaProps.configured()) {
            return Mono.just(o);
        }
        return chapa.verify(o.txRef()).flatMap(v -> {
            if (!v.paid()) {
                return Mono.just(o);
            }
            if (v.amount() != null && v.amount().compareTo(o.totalEtb()) < 0) {
                log.warn("Order {} paid {} but total is {}; left pending for review", o.id(), v.amount(), o.totalEtb());
                return Mono.just(o);
            }
            Mono<Long> markBook = o.bookId() == null ? Mono.just(0L)
                    : db.sql("UPDATE books SET status = 'ORDERED' WHERE id = :id").bind("id", o.bookId()).fetch().rowsUpdated();
            return orders.save(o.paid(v.reference(), v.method())).flatMap(saved -> markBook.thenReturn(saved));
        }).onErrorResume(e -> {
            log.warn("Could not verify payment for order {}: {}", o.id(), e.getMessage());
            return Mono.just(o);
        });
    }

    // ---- print team ----------------------------------------------------------

    public Flux<OrderResponse> all(String status) {
        return (blank(status) ? orders.findAllByOrderByCreatedAtDesc() : orders.findByStatusOrderByCreatedAtDesc(status))
                .map(OrderResponse::from);
    }

    public Mono<OrderResponse> updateStatus(UUID orderId, String status, String note) {
        if (!ADMIN_STATUSES.contains(status)) {
            return Mono.error(new BadRequestException("Status must be one of " + ADMIN_STATUSES));
        }
        return orders.findById(orderId)
                .switchIfEmpty(Mono.error(new NotFoundException("Order", orderId)))
                .flatMap(o -> {
                    boolean unpaid = BookOrder.PENDING.equals(o.status()) || "PAYMENT_FAILED".equals(o.status());
                    if (unpaid && !"CANCELLED".equals(status)) {
                        return Mono.error(new BadRequestException("This order is not paid yet"));
                    }
                    return orders.save(o.withStatus(status, trimToNull(note)));
                })
                .map(OrderResponse::from);
    }

    public record PrintFile(String title, JsonNode settings, JsonNode pages, java.util.Map<String, String> photoUrls) {
    }

    /** The book exactly as ordered, with fresh photo links, so the print team can print it. */
    public Mono<PrintFile> printFile(UUID orderId) {
        return orders.findById(orderId)
                .switchIfEmpty(Mono.error(new NotFoundException("Order", orderId)))
                .flatMap(o -> {
                    JsonNode snap;
                    try {
                        snap = json.readTree(o.snapshot().asString());
                    } catch (Exception e) {
                        return Mono.error(new BadRequestException("This order's pages could not be read"));
                    }
                    java.util.Set<UUID> ids = new java.util.HashSet<>();
                    snap.path("pages").forEach(page -> page.path("slots").forEach(v -> {
                        try {
                            ids.add(UUID.fromString(v.asText()));
                        } catch (IllegalArgumentException ignored) {
                            // a text slot, not a photo
                        }
                    }));
                    if (ids.isEmpty()) {
                        return Mono.just(new PrintFile(o.bookTitle(), snap.path("settings"), snap.path("pages"), java.util.Map.of()));
                    }
                    return db.sql("SELECT id, object_key FROM memory_media WHERE id = ANY(:ids) UNION ALL SELECT id, object_key FROM book_media WHERE id = ANY(:ids)")
                            .bind("ids", ids.toArray(new UUID[0]))
                            .map(row -> java.util.Map.entry(row.get("id", UUID.class).toString(), storage.presignedGetUrl(row.get("object_key", String.class))))
                            .all()
                            .collectMap(java.util.Map.Entry::getKey, java.util.Map.Entry::getValue)
                            .map(urls -> new PrintFile(o.bookTitle(), snap.path("settings"), snap.path("pages"), urls));
                });
    }

    static String[] splitName(String full) {
        String n = full.trim().replaceAll("\\s+", " ");
        int i = n.indexOf(' ');
        return i < 0 ? new String[] {n, n} : new String[] {n.substring(0, i), n.substring(i + 1)};
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String trimToNull(String s) {
        return blank(s) ? null : s.trim();
    }
}
