# tpg-timetable-exporter

Export your enrolled course timetable from the [CDS TPG Student Portal](https://enrolment-student.tpg.cds.hku.hk/timetable/2026-1) to `.ics` (calendar) and JSON.

The site is a Vite SPA. After login it talks to `/api` with a Bearer token. This project calls that API directly, so reruns do not need a browser.

## Setup

```bash
bun install
cp .env.example .env
```

Fill `.env` with your **Student Portal** email and password (the login page says these are not HKU Portal credentials).

Alternatively, log in in Chrome, then paste `localStorage.accessToken` into `TPG_ACCESS_TOKEN`.

The login endpoint allows 5 attempts per minute. A valid session is cached in `.auth/session.json` (gitignored).

## Commands

```bash
bun run login
bun run dump
bun run dump --term 2026-1
bun run export
bun run export --term 2026-2
bun test
```

`dump` writes anonymization-sensitive JSON under `out/dump/`. `export` writes:

- `out/timetable-2026-1.ics`
- `out/timetable-2026-1.json`

If `--term` is omitted, the current enrollment term from the portal is used (currently 2026 Semester 1).

## How it maps to the portal

| Portal                             | API                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Login                              | `POST /api/auth/login` `{ email, password }` → `accessToken`                                              |
| Session restore                    | `GET /api/auth/profile`                                                                                   |
| Enrolled courses                   | `GET /api/student-study-period/by-uid/:uid`                                                               |
| Timetable page `/timetable/2026-1` | Filter classes by `academic_year` + `semester`; each class has `timetable[]` with `start`, `end`, `venue` |

Enrollment statuses `5`, `6`, and `7` are hidden in the portal UI, so they are omitted here too.

ICS files are generated with [ical-generator](https://www.npmjs.com/package/ical-generator). Naive portal timestamps are interpreted as `Asia/Hong_Kong` via [Luxon](https://moment.github.io/luxon/).
