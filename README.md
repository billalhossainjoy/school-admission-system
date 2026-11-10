# School Admission System

Take-home assignment built with ASP.NET Core 10, PostgreSQL, and React (frontend planned).

## Project status

The project is under development.

- ASP.NET Core backend with `GET /health`
- PostgreSQL configured with Docker Compose
- EF Core database setup and migrations being verified
- Class management API and controller tests are available
- React frontend and the remaining admission APIs are still in development

## Run with Docker

**Prerequisite:** Docker with Docker Compose.

From the repository root:

```bash
docker compose up --build
```

Current backend health endpoint: http://localhost:8080/health

The React frontend is not available yet. Its URL will be documented here once implemented.

To stop the application:

```bash
docker compose down
```

Do not use `docker compose down -v` if you want to preserve PostgreSQL data.

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

```

## Required functionality

The final submission will include class management, seat holds, confirmation, cancellation, automatic expiration, application history, and a React interface.

See `ASSUMPTIONS.md` for documented decisions and `AI_USAGE.md` for AI assistance disclosure.
