package com.teguwaz.account;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teguwaz.account.AccountService.DeletionResult;
import com.teguwaz.account.AccountService.PrivacySettings;
import com.teguwaz.user.CurrentUserService;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/me")
public class AccountController {

    private final CurrentUserService currentUser;
    private final AccountService accounts;

    public AccountController(CurrentUserService currentUser, AccountService accounts) {
        this.currentUser = currentUser;
        this.accounts = accounts;
    }

    @GetMapping("/privacy")
    public Mono<PrivacySettings> privacy() {
        return currentUser.currentUserId().flatMap(accounts::privacy);
    }

    @PutMapping("/privacy")
    public Mono<PrivacySettings> updatePrivacy(@RequestBody PrivacySettings body) {
        return currentUser.currentUserId().flatMap(id -> accounts.updatePrivacy(id, body.defaultPrivacy()));
    }

    @GetMapping(value = "/export", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<Map<String, Object>>> export() {
        return currentUser.currentUserId().flatMap(accounts::export).map(body -> ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"teguwaz-data-" + LocalDate.now() + ".json\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(body));
    }

    public record DeleteRequest(String confirm) {
    }

    @DeleteMapping
    public Mono<DeletionResult> delete(@RequestBody DeleteRequest body) {
        return currentUser.currentUser().flatMap(u -> accounts.deleteAccount(u, body == null ? null : body.confirm()));
    }
}
