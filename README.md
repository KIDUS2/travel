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
| 2 | Coverage map (region %, badges) | computed from memories for now | ✅ |
| 3 | Book studio (types, customize, preview, order) | ⏳ next | ✅ UI |
| 4 | Creator studio (YouTube → Instagram → TikTok) | ⏳ | ✅ UI, sample data |
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
docker compose up -d   # Postgres :5432, Keycloak :8180, MinIO :9000 (console :9001)

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
| `MINIO_ENDPOINT` / `MINIO_PUBLIC_ENDPOINT` | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` | `teguwaz` / `teguwaz-secret` / `teguwaz-media` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` |
| `UPLOAD_MAX_SIZE` | `200MB` |

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

## Tests

```bash
cd backend && mvn test
cd frontend && npm test     # includes the Ethiopian calendar conversion
```
