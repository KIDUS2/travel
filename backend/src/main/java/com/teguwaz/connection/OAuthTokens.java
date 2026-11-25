package com.teguwaz.connection;

/** Tokens from any platform. {@code refreshToken} may be null (Instagram refreshes with the access token). */
public record OAuthTokens(String accessToken, String refreshToken, long expiresInSeconds, String scope, String accountId) {
}
