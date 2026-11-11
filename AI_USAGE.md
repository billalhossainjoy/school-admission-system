# AI usage

Codex assisted with the React frontend, including translating the supplied
Figma screens into components, wiring the existing API, and reviewing the
assignment requirements. The backend was already present when this frontend
work started.

The first frontend pass kept the student ID only in session storage. Reviewing
the assignment exposed that browser restart recovery was required, so the
student lookup now persists the last valid ID in local storage. Build and lint
checks were used while making these changes.
