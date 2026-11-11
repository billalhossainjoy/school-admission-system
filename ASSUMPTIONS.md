# Assumptions

This file records decisions where the assignment leaves room for
interpretation. It also documents behavior currently relied on by the backend.

1. **Class and shift:** Each class/shift combination is represented by one
   class record. For example, `Class 6 - Morning` and `Class 6 - Day` have
   independent capacities, with the shift included in the class name.

2. **Admin identity:** The assignment does not specify an admin login flow.
   Class creation is therefore an unauthenticated demo operation, not a
   production authorization design.

3. **Student identity:** The `X-Student-Id` header identifies the acting
   student. It must contain exactly 17 decimal digits. Because no
   authentication or identity-verification flow is specified, this is a demo
   identity mechanism; production use would require authenticated identity
   verification.

4. **Clock and expiration:** Timestamps are stored and compared in UTC.
   `HOLD_DURATION_SECONDS` controls the lifetime of a newly created hold and
   defaults to 600 seconds. A non-positive configured duration is rejected.

5. **Seat occupancy:** An unexpired `HELD` record and every `CONFIRMED` record
   occupy a seat. `CANCELLED` and `EXPIRED` records do not. Expired holds are
   marked `EXPIRED` when relevant operations run rather than being removed by a
   background job.

6. **Application history:** Holds are retained as historical records instead
   of being physically deleted. A student cannot create another hold for the
   same class while an existing hold is `HELD` or `CONFIRMED`; reapplication is
   allowed after expiration or cancellation.

7. **Hold ownership and transitions:** Only the student whose ID is stored on a
   hold may confirm or cancel it. Confirmation is idempotent for an already
   confirmed hold. Cancellation is idempotent for cancelled or expired holds,
   and confirmed holds may also be cancelled.

8. **HTTP error choices:** Invalid input returns `400`, missing classes or
   holds return `404`, ownership failures return `403`, and reservation or
   state conflicts return `409`, unless the endpoint contract specifies another
   response.

9. **Concurrency:** Hold creation, confirmation, and cancellation use a
   PostgreSQL transaction with a row-level lock on the class. This serializes
   seat allocation for a class and prevents concurrent requests from
   overbooking it.

These decisions describe the current backend behavior. Authentication,
background expiration processing, and the React frontend remain outside the
current implementation scope.
