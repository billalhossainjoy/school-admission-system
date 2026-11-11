# School Admission System

Take-home assignment built with ASP.NET Core 10, PostgreSQL, and React.

## Project status

The backend currently provides:

- `GET /health` health check
- Class creation and seat availability queries
- Temporary seat holds with configurable expiration
- Hold lookup, confirmation, cancellation, and student history
- Automatic expiration of stale holds
- PostgreSQL transactions and row-level class locking for seat allocation
- EF Core migrations and integration tests backed by Testcontainers

The React frontend includes class discovery, seat holds, confirmation,
cancellation, and student application history. The school admin screen is still
in progress.

## Run with Docker

**Prerequisite:** Docker with Docker Compose.

From the repository root:

```bash
docker compose up --build
```

Current backend health endpoint: http://localhost:8080/health

The frontend currently runs separately during development:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite. `frontend/.env` sets the backend URL, and Vite
proxies API requests to it during development.

To stop the application:

```bash
docker compose down
```

Do not use `docker compose down -v` if you want to preserve PostgreSQL data.

## Configuration

`HOLD_DURATION_SECONDS` controls the lifetime of a newly created hold and
defaults to `600` seconds. It can be supplied as an environment variable when
running the API:

```bash
HOLD_DURATION_SECONDS=120 dotnet run --project backend
```

For local development, load the repository `.env` before starting the API:

```bash
set -a
. ./.env
set +a
dotnet run --project backend
```

Docker Compose loads the same `.env` automatically for the `api` service.

The API uses the `DefaultConnection` connection string. Docker Compose provides
the PostgreSQL database automatically.

## API overview

All student-specific endpoints use the `X-Student-Id` header. The value must
contain exactly 17 decimal digits.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/classes` | Create a class and its seat capacity |
| `GET` | `/classes` | List classes with held, confirmed, and available seats |
| `GET` | `/classes/{classId}` | Get one class and its seat availability |
| `POST` | `/classes/{classId}/holds` | Create a temporary hold |
| `GET` | `/holds/{holdId}` | Get hold details |
| `POST` | `/holds/{holdId}/confirm` | Confirm a hold |
| `DELETE` | `/holds/{holdId}` | Cancel a hold |
| `GET` | `/me/holds` | List all holds for the requesting student |

Hold statuses are `HELD`, `CONFIRMED`, `CANCELLED`, and `EXPIRED`. Historical
records are retained in the database.

## Backend tests

The backend tests use `Testcontainers.PostgreSql` to start a temporary
`postgres:16-alpine` container. Docker must be installed and running before
executing the tests.

Run all backend tests from the repository root:

```bash
dotnet test backend/tests/SchoolAdmission.Tests/SchoolAdmission.Tests.csproj
```

The test fixture creates the database schema in the container before each test
and removes the container after the test run. No local PostgreSQL installation
or test database configuration is required.

See [ASSUMPTIONS.md](ASSUMPTIONS.md) for documented design decisions.

## Frontend checks

```bash
cd frontend
npm run build
npm run lint
```
