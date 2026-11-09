# Assumptions

This file records decisions where the assignment leaves room for interpretation. Update it as the implementation progresses.

1. **Class and shift:** Each class/shift combination is represented by one class record. For example, "Class 6 - Morning" and "Class 6 - Day" have independent seat capacities, with the shift included in the class name.

2. **Admin identity:** The assignment does not specify an admin login flow. Class creation is treated as an unauthenticated demo operation, not as a production-grade authorization design.

3. **Student identity:** The required 17-digit `X-Student-Id` header identifies the acting student. As no login/identity verification is specified, this header is treated as a demo identity; real-world identity verification would be required for production.

4. **Clock and expiration:** All expiration timestamps will be stored and compared in UTC to avoid timezone-dependent behavior. The configured `HOLD_DURATION_SECONDS` (default 600) controls the lifetime of a newly created hold.

5. **Application history:** Expired and cancelled holds remain as historical records instead of being physically deleted. Only active, unexpired holds and confirmed holds occupy seats.

6. **HTTP error choices:** Use `400` for invalid input, `404` for nonexistent resources, and `409` for reservation conflicts, unless the assignment explicitly specifies another response.

7. **Concurrency:** Seat allocation will be coordinated with PostgreSQL transactions and row-level locking so that multiple backend instances cannot overbook the same class.

These are design decisions, not claims that all features are already implemented.
