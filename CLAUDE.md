# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An admission and course management system for a computer training institute. One Express + Sequelize + Postgres API (`server/`) and one React + Vite SPA (`client/`), deployed together via Docker Compose behind nginx on EC2, with Jenkins doing the build/deploy.

There is no root `package.json`. Every command runs from inside `server/` or `client/`.

## Commands

Backend (`cd server`):

```
npm run dev          # nodemon index.js — port 5000
npm start            # node index.js
npm test             # jest (unit tests over server/utils only)
npx jest sections    # run one test file by name substring
npx jest -t "fast_track overlaps"   # run one test by name
```

Frontend (`cd client`):

```
npm run dev          # vite on port 5173, strictPort
npm run build         # vite build -> dist/
npm run lint          # oxlint (not eslint)
npm run preview
```

Whole stack: `docker compose up -d --build` from the repo root. `VITE_API_BASE_URL` must be set in the root environment because the client Dockerfile bakes it in at build time as a build arg.

Tests only exist for `server/utils/*` (8 suites, 58 tests, all passing). There is no client test runner and no jest config file, so jest runs on defaults. On a cold first run on Windows a jest worker can crash and report a phantom suite failure while every test still passes; re-run before investigating.

`npm run lint` currently reports warnings only, mostly unused variables in `TeacherRegister.jsx` left behind by the commented-out UI sections described below.

## Architecture

### Request path and auth

`server/index.js` is the single wiring point: it requires every model (so `sequelize.sync({ alter: true })` sees them all), then mounts routes in two explicit blocks.

Public, no login: `/api/admin-auth`, `/api/attendance-auth`, `/api/teacher-auth`, `/api/holidays`, `/api/review`. Everything else is wrapped in `requireAdminAuth`.

Three separate trust domains, all signed with the same `JWT_SECRET` but never interchangeable:

- **Admin** — `admin_token` httpOnly cookie, checked by `server/middleware/adminAuth.js`, which also accepts a `Bearer` header. Populates `req.admin.adminId`.
- **Teacher** — `teacher_token` cookie, checked by `server/middleware/teacherAuth.js`, which additionally requires `role === "teacher"`. The teacher routes are mounted under the *public* `/api/teacher-auth` prefix and apply `requireTeacherAuth` per-route instead, so read the route file rather than assuming.
- **Jitsi** — `server/utils/jitsiToken.js` signs with `JITSI_APP_SECRET`, verified only by the self-hosted Jitsi server. Do not conflate it with the app's own sessions.

Slugs are pre-fill conveniences, never credentials. A teacher's `slug` link only pre-fills their login form; an admission's `slug` link only starts an email OTP flow. Controllers cross-check the session cookie against the slug's owner.

### Multi-tenancy by admin_id

Almost every table carries a nullable `admin_id` UUID pointing at `Admin.adminId`, and controllers scope queries by `req.admin.adminId`. When adding a query to an admin-facing controller, scope it. The public review endpoint is a deliberate exception and returns course/teacher names unscoped, documented in `reviewController.js`.

### Sequelize conventions that matter

Schema changes happen through `sequelize.sync({ alter: true })` at boot. There are no migration files.

**Do not add new `belongsTo`/`hasMany` associations to already-heavily-associated models** (`Admission`, `Batch`, `InformationSheet`, `Admin`). Doing so made `alter: true` miscompute its diff and try to drop a still-in-use foreign key constraint, which failed the whole sync and stopped the server from booting. `FollowUp.js`, `ClassRecording.js` and `CourseVideo.js` all carry long comments explaining this. The established workaround is a plain `references:` column for real DB-level FK integrity, plus batched `findAll` lookups by id in the controller instead of a Sequelize `include`.

Associations live at the bottom of individual model files, not in a central index. Most models use `timestamps: true` with `createdAt: "created_at"` and `updatedAt: false`.

Idempotent data backfills run on every boot inside `server/index.js` (`migrateFatherInitial`, `migrateInformationSheetNames`). They are written to no-op once done and are meant to stay there rather than be run manually.

### Soft delete, two flavors

Older domain tables (`Admission`, `Course`, `Subject`, `Teacher`, `FeeEntry`, `InformationSheet`) use an `active` boolean plus dedicated `/inactive` list pages and `PUT /:id/restore` endpoints. Newer tables (`Expense`, `FollowUp`, `ClassRecording`, `CourseVideo`) use `is_deleted`. Records are essentially never hard-deleted; check which flag a table uses before writing a query.

### Domain model

`Admission` is the student record. `InformationSheet` is a separate, parallel enquiry/intake record with overlapping name fields, not a view of `Admission`.

`Course` ⇄ `Subject` many-to-many via `CourseSubject`; `Subject` is also self-referencing (`Parent` / `SubSubjects`). `Teacher` ⇄ `Course` via `TeacherCourse`.

A `Batch` is (subject × teacher × section × timing). Sections are a fixed enum in `server/utils/sections.js` — `fast_track`, `normal_mwf`, `normal_tts`, `weekend` — each mapping to a day list. `Batch` ⇄ `Admission` many-to-many via `BatchStudent`. `BatchSession` is one class occurrence, unique on `(batch_id, date)`, and an Online Class is a `class_mode` on that same row rather than a separate entity. `BatchSubstitution` covers teacher stand-ins; batch transfer instead reassigns `teacher_id` and records the origin in `transferred_from_teacher_id`.

Scheduling-conflict rules live in `server/utils/batchConflicts.js` and are deliberately shared by both the admin batch CRUD and the teacher self-service batch CRUD so the two entry points cannot drift.

Two independent attendance concepts: **class attendance** (`Attendance`, per batch session, marked by the teacher or by student QR/OTP) and **entry attendance** (`StudentEntryAttendance`, `TeacherEntryAttendance`, campus gate in/out). They are not cross-checked into each other — `server/utils/studentRisk.js` explains why that limits what risk signals are derivable.

Teacher capabilities are opt-in per teacher and default to off: `can_create_batches` and `can_host_online_classes`. Both are enforced inside the controller, not by the route.

### Client

Flat `components/<Feature>/<Feature>.jsx` layout, all routing declared in `client/src/App.jsx`. Public routes sit outside the layout; admin routes nest under `ProtectedRoute` → `AdminLayout` (which owns the top nav); teacher routes nest under `TeacherProtectedRoute`. Bootstrap 5 for styling, imported globally in `main.jsx`. Several components are very large (`TeacherRegister.jsx` is ~3200 lines, `BatchManagement.jsx` ~2400).

`client/src/api/api.js` is the only axios instance. It uses `withCredentials: true` for the cookie session, and falls back to `http://<current hostname>:5000/api` when `VITE_API_BASE_URL` is unset so LAN/phone testing works without editing `.env`. Its 401 interceptor redirects to `/login`, with an explicit allowlist of public path segments that must not trigger that redirect — add to `PUBLIC_PATH_SEGMENTS` when you add a public endpoint.

Some client logic intentionally mirrors server logic: `client/src/utils/timingMatch.js` mirrors `server/utils/timeRange.js`, including its AM/PM leniency. Keep them in step.

`useArrowKeyFormNav` (`client/src/utils/arrowKeyFormNav.js`) is applied at the layout level and gives arrow-key movement between form fields. Its rules are subtle — left/right only jump when the caret is already at the field's edge, selects are targets but not triggers — so read the header comment before touching form inputs.

### External integrations

All secrets stay server-side; the browser never holds an API key.

- **S3** (`server/utils/s3.js`) — presigned PUT/GET URLs only, 5-minute expiry, so recordings and course videos never transit this server. Credentials come from the EC2 instance's IAM role, so there are no static AWS keys anywhere.
- **Jitsi** — self-hosted. Room slugs are HMAC-derived from batch id + date so teacher and students land in the same non-guessable room with no coordination.
- **Recording** — browser-side tab capture in `client/src/utils/callRecorder.js`, chosen over Jitsi's Jibri to avoid running that component. The teacher's mic is a separate track that must be mixed in explicitly.
- **Groq** — `reviewController.js` generates student review text. Model id is pinned in that file.
- **WhatsApp** — proxied through a self-hosted wacrm instance in `whatsappController.js`.
- **Gmail via nodemailer** — OTP email, split across `utils/mailer.js` (student) and `utils/adminMailer.js` (admin).
- **Student app** — a separate Flutter app's backend, base URL hardcoded in `client/src/utils/studentAppSync.js` on purpose, since it is not this app's deploy config. Sync calls are fire-and-forget so a hiccup there never blocks saving an admission.

## Conventions

Controllers return `{ success: boolean, data | message }` and set the HTTP status explicitly. Validation failures return 400 with a `field` name where the client needs to highlight one; upstream failures return 502.

The codebase is unusually heavily commented, and the comments carry real decision history — why an association was omitted, why a signal was left out of a risk score, why a value is hardcoded. Read them before changing the code they sit on, and match that density when adding non-obvious logic.

Dates are frequently compared as plain `YYYY-MM-DD` strings rather than `Date` objects (`followUpStatus.js`, `commonEnrolNo.js`). That is the established idiom for `DATEONLY` columns here.

## Repo-specific notes

`HIDDEN_UI_SECTIONS.md` tracks UI sections that were commented out rather than deleted. Each hidden block is wrapped in a comment naming the section, so re-enabling one means removing the wrapper. Keep that file updated when hiding or restoring a section.

`server/controllers/authController.js` and `server/routes/authRoutes.js` are empty files and are not mounted. Admin auth lives in `adminAuthController.js`.

Two git remotes: `origin` is `yasir-sa/admission-management-app`, `manager-origin` is `cscmadipakkam96-Rephel/admission-management-app`.

`server/.env` is gitignored and holds real credentials. Root `.env.example` documents only the client's `VITE_API_BASE_URL`; the server's own required variables are `PORT`, `ALLOWED_ORIGINS`, `JWT_SECRET`, `DATABASE_URL` (or the `DB_*` set), `EMAIL_USER`/`EMAIL_PASSWORD`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `GROQ_API_KEY`, `JITSI_DOMAIN`/`JITSI_APP_ID`/`JITSI_APP_SECRET`, `S3_BUCKET_NAME`/`AWS_REGION`, `WACRM_API_URL`/`WACRM_API_KEY`.

`ALLOWED_ORIGINS` is a comma-separated CORS allowlist and is enforced strictly, so a new frontend origin has to be added there or requests fail.
