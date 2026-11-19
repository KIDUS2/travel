# Teguwaz · ተጓዥ

**Teguwaz** ("traveler" in Amharic) keeps a traveler's memories in one place: private memories and printed books, a map of how much of Ethiopia (then the world) they've covered, and one dashboard for their YouTube, TikTok and Instagram results.

Ethiopia first, global next.

## What's in this repo

| Folder | What |
|---|---|
| `backend/` | Spring Boot 3.5 · WebFlux · R2DBC PostgreSQL · Flyway · Keycloak (JWT) · MinIO |
| `frontend/` | React · Vite · TypeScript, Ethiopian theme (flag colors, tibeb patterns, Amharic + English, Ethiopian calendar) |
| `infra/keycloak/` | Realm import for local development |
| `docker-compose.yml` | PostgreSQL, Keycloak and MinIO for local development |

## Feature status

Built one feature at a time.

| # | Feature | Backend | Frontend |
|---|---|---|---|
| 1 | Account, trips, memories, photo/video/voice upload, privacy | ✅ | ✅ connected |
| 2 | Coverage map: explore any country (drag, zoom, search), tap a place for its memories; region %, badges | computed from memories for now | ✅ |
| 3 | Book studio: create from a trip with auto-fill, page editor (drag photos, edit text, layouts, backgrounds, add/reorder pages), preview, print / PDF | ✅ | ✅ connected (ordering later) |
| 4 | Creator studio: connect YouTube (OAuth, encrypted tokens, channel stats + 28-day analytics); Instagram and TikTok next | ✅ YouTube | ✅ connected |
| — | Travel dashboard: memories by month, regions, places, media, privacy, trips, books | from existing APIs | ✅ |
| 5 | Policy alerts | ⏳ | ✅ UI, sample data |

## Try the UI without a backend

```bash
cd frontend
npm install
npm run dev            # demo mode is on by default: sample data, no login
```

Open http://localhost:5173.

## Run the full stack

```bash
# 1. Infrastructure
docker compose up -d postgres keycloak   # add "minio" only if you use STORAGE_TYPE=s3

# 2. Backend (Java 21)
cd backend
mvn spring-boot:run    # http://localhost:8080 — Flyway creates the tables

# 3. Frontend, connected to the backend
cd frontend
cp .env.example .env   # then set VITE_DEMO_MODE=false
npm install
npm run dev
```

Sign in with the local test user **meron** / **teguwaz-dev** (development only), or register a new account.

### Backend configuration

All settings have local defaults in `backend/src/main/resources/application.yml` and can be overridden with environment variables:

| Variable | Default |
|---|---|
| `DB_R2DBC_URL` / `DB_JDBC_URL` | `r2dbc:postgresql://localhost:5432/teguwaz` / `jdbc:postgresql://localhost:5432/teguwaz` |
| `DB_USER` / `DB_PASSWORD` | `teguwaz` / `teguwaz` |
| `KEYCLOAK_ISSUER` | `http://localhost:8180/realms/teguwaz` |
| `STORAGE_TYPE` | `local` (files in a folder) or `s3` (MinIO / SeaweedFS / S3) |
| `UPLOAD_DIR` | `./data/uploads` — where `local` storage keeps files |
| `FILE_LINK_SIGNING_KEY` | Signs file links for `local` storage. Set it in production so links survive restarts |
| `MINIO_ENDPOINT` / `MINIO_PUBLIC_ENDPOINT` | `http://localhost:9000` (only for `s3`) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | `teguwaz` / `teguwaz-secret` / `teguwaz-media` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` |
| `UPLOAD_MAX_SIZE` | `200MB` |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | Google OAuth client (Web application) with YouTube Data API v3 and YouTube Analytics API enabled |
| `YOUTUBE_REDIRECT_URI` | `http://localhost:8080/api/connections/youtube/callback` (add it to the OAuth client) |
| `TOKEN_ENCRYPTION_KEY` | Encrypts stored OAuth tokens. `openssl rand -base64 32` |
| `OAUTH_STATE_KEY` | Signs the OAuth state (any long random string) |
| `FRONTEND_URL` | `http://localhost:5173` — where the browser returns after connecting |

### Where files are saved

By default (`STORAGE_TYPE=local`) uploads go to `UPLOAD_DIR` on the server, e.g. `data/uploads/users/{id}/memories/...`.
The folder is never served directly: the app gets signed links to `/api/files/...` that expire after an hour.
Switch to MinIO/SeaweedFS with `STORAGE_TYPE=s3`; file keys are the same, so you can move the folder's contents into the bucket.

## API (Feature 1)

All endpoints need a Keycloak bearer token.

| Method | Path | |
|---|---|---|
| GET / PUT | `/api/me` | Profile (created on first sign-in), display name, language `en`/`am` |
| GET / POST | `/api/trips` | List (with memory counts) / create |
| GET / PUT / DELETE | `/api/trips/{id}` | Deleting a trip keeps its memories |
| GET | `/api/memories?tripId=&page=&size=` | Newest first; by trip in time order |
| POST | `/api/memories` | Create. Send a `clientId` (UUID) from the device; repeating it returns the same memory, so offline sync can retry safely |
| GET / PUT / DELETE | `/api/memories/{id}` | Delete also removes stored files |
| PATCH | `/api/memories/{id}/privacy` | `PRIVATE` · `FAMILY` · `PUBLIC` |
| POST | `/api/memories/{id}/media` | Multipart `file` — photo, video or audio |
| DELETE | `/api/memories/{id}/media/{mediaId}` | |

Media is stored in a private MinIO bucket; responses carry short-lived signed URLs.

## API (Feature 3: books)

| Method | Path | |
|---|---|---|
| GET / POST | `/api/books` | List (with page counts) / create |
| GET / PUT / DELETE | `/api/books/{id}` | The editor autosaves the whole book with `PUT`; delete also removes uploaded photos |
| GET / POST | `/api/books/{id}/photos` | Photos uploaded from the device into the book (multipart `file`, images only) |
| DELETE | `/api/books/{id}/photos/{photoId}` | |

A book's `pages` is a JSON array. Each page has a `layout` (`cover`, `title`, `full-photo`, `photo-text`, `two-photos`, `grid-3`, `story`, `map`), a `background` (`white`, `cream`, `green`, `tibeb`) and `slots`: text, or a photo id for photo boxes (a memory's media id or a book photo id). At most 200 pages per book.

## API (Feature 4: connected accounts)

| Method | Path | |
|---|---|---|
| GET | `/api/connections` | Each platform: available on this server, connected, account name, last sync |
| POST | `/api/connections/{platform}/start` | Returns the platform's sign-in URL (`youtube` today) |
| GET | `/api/connections/{platform}/callback` | Public; the platform redirects here, then back to the app |
| GET | `/api/connections/youtube/stats` | Subscribers, views, videos, and the last 28 days of views, likes, comments, shares |
| DELETE | `/api/connections/{platform}` | Disconnect and revoke access |

## Tests

```bash
cd backend && mvn test
cd frontend && npm test     # includes the Ethiopian calendar conversion
```
