# School Admission System

Take-home assignment built with ASP.NET Core 10, PostgreSQL, and React (frontend planned).

## Project status

The project is under development.

- ASP.NET Core backend with `GET /health`
- PostgreSQL configured with Docker Compose
- EF Core database setup and migrations being verified
- Admission APIs, React frontend, and automated tests are not complete yet

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

## Tests

Automated backend tests have not been added yet. Before submission, add the test command and instructions here, including the required concurrency test.

## Required functionality

The final submission will include class management, seat holds, confirmation, cancellation, automatic expiration, application history, and a React interface.

See `ASSUMPTIONS.md` for documented decisions and `AI_USAGE.md` for AI assistance disclosure.
