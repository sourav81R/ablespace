# AbleSpace Task Management System

Full Stack Developer (Fresher) technical assessment — a task/project management
application built with Next.js, NestJS and MongoDB.

**Status:** backend and web client are both implemented. See
[Verification status](#verification-status) for what has been confirmed
running, and [Intentional deviations](#intentional-deviations-from-the-supplied-documents)
for where the implementation departs from the brief — the visual design in
particular.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | NestJS 10, TypeScript |
| Database | MongoDB (Atlas) via Mongoose 8 |
| Authentication | Firebase Authentication + Firebase Admin SDK |
| Validation | class-validator / class-transformer |
| API style | REST, consistent JSON envelope |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Client state | TanStack Query; filter state in the URL |
| Icons | Lucide React |

---

## Repository layout

```
ablespace-task-manager/
├── apps/
│   └── api/                    NestJS backend
│       ├── src/
│       │   ├── auth/           Firebase verification, guard, session provisioning
│       │   ├── users/          Profile, workspace member lookup
│       │   ├── workspaces/     Membership, access list, leave workspace
│       │   ├── projects/       Project CRUD
│       │   ├── tasks/          Task CRUD, search, filtering
│       │   ├── subtasks/       Subtask CRUD
│       │   ├── comments/       Comment CRUD
│       │   ├── labels/         Workspace-scoped labels
│       │   ├── activity/       Append-only task history
│       │   ├── health/         Liveness + database ping
│       │   ├── common/         Filters, interceptors, pipes, serialisers, types
│       │   ├── config/         Environment validation
│       │   └── database/       Connection module + seed script
│       └── test/
│   │
│   └── web/                    Next.js client
│       └── src/
│           ├── app/
│           │   ├── (auth)/login/          Guest + Google sign-in
│           │   └── (dashboard)/           Every authenticated route
│           │       ├── tasks/             Board and list, plus [taskId] detail
│           │       ├── projects/          Table, plus [projectId] detail
│           │       └── settings/profile/  Profile and workspace
│           ├── components/
│           │   ├── ui/         Primitives: button, dialog, dropdown, toast, states
│           │   ├── layout/     AppShell, sidebar, mobile drawer, user menu
│           │   ├── tasks/      Board, list, card, toolbar, detail
│           │   └── projects/   Project form
│           └── lib/
│               ├── api/        Client, query hooks, query keys
│               ├── auth/       AuthProvider
│               ├── firebase/   Web SDK, isolated here
│               ├── theme/      Mode + accent tokens, pre-paint script
│               └── tasks/      URL-backed filter state
├── packages/
│   └── shared/                 Enums + API contract types shared by both apps
└── docs/                       PRD, architecture, plan, task breakdown
```

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- pnpm 8
- A MongoDB database (Atlas or local)
- A Firebase project with Anonymous and Google sign-in enabled

### 1. Install

```bash
pnpm install
pnpm --filter @ablespace/shared build
```

The shared package must be built before the API — the API's TypeScript paths
resolve `@ablespace/shared` to its compiled output.

### 2. Configure the environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Fill in the values described in [Environment variables](#environment-variables).
The API needs the Firebase **Admin** credentials (a server-side secret); the web
app needs the Firebase **web** config (public by design).

### 3. Enable Anonymous sign-in

In the Firebase console: **Authentication → Sign-in method → Anonymous →
Enable**. Guest login cannot work without it — `signInAnonymously` returns
`auth/admin-restricted-operation`. Enable **Google** there too if you want that
button to work.

### 4. Run

Two processes, in separate terminals:

```bash
pnpm dev:api          # http://localhost:4000/api
pnpm dev:web          # http://localhost:3000
```

Verify the API is up before using the client:

```bash
curl http://localhost:4000/api/health
```

A healthy response reports `database: "up"` and `auth: "configured"`.

### 5. Seed demo data (optional)

```bash
pnpm seed                          # seeds the built-in demo user
pnpm seed -- --uid=<firebaseUid>   # seeds a specific Firebase account
```

Seeding creates three projects, eleven tasks spread across all four board columns,
five labels, plus subtasks, comments and activity on one task. It is safe to
re-run: the target workspace is cleared first.

---

## Environment variables

All are read from `apps/api/.env` and validated at boot — a missing or malformed
value fails the process immediately rather than surfacing later as a confusing
runtime error.

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | no | `development` (default), `production`, or `test` |
| `PORT` | no | Defaults to `4000` |
| `API_PREFIX` | no | Route prefix, defaults to `api` |
| `MONGODB_URI` | **yes** | Connection string, including the database name |
| `CORS_ORIGIN` | **yes** in production | Allowed browser origin(s), comma-separated. Defaults to `http://localhost:3000` outside production; `*` is rejected and an unset value fails the boot in production |
| `FIREBASE_PROJECT_ID` | **yes** in practice | `project_id` from the service account |
| `FIREBASE_CLIENT_EMAIL` | **yes** in practice | `client_email` from the service account |
| `FIREBASE_PRIVATE_KEY` | **yes** in practice | `private_key` PEM block, newlines escaped as `\n` |
| `THROTTLE_TTL_SECONDS` | no | Rate-limit window, defaults to `60` |
| `THROTTLE_LIMIT` | no | Requests per window per IP, defaults to `120` |

### Obtaining the Firebase Admin credentials

The web SDK config (`apiKey`, `authDomain`, …) is **not** what the server needs
— that one is public and belongs in the browser. The Admin SDK requires a
service-account private key, which is a server-side secret.

1. Firebase Console → Project Settings → **Service Accounts**
2. **Generate new private key** → downloads a JSON file
3. Copy three fields out of that JSON into your `.env`:

| JSON field | Environment variable |
| --- | --- |
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

```dotenv
FIREBASE_PROJECT_ID=ablespace-c0b4d
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ablespace-c0b4d.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n"
```

#### The private key newline problem

`private_key` is a multi-line PEM block, but environment variables generally
cannot hold real newlines. The value is therefore stored with its newlines
escaped as the two characters `\` and `n` — which is exactly how it already
appears inside the downloaded JSON, so copying it verbatim gives the right
form. Keep it on one line and wrap it in double quotes.

`normalisePrivateKey()` in `src/config/configuration.ts` converts those escapes
back to real newlines at boot, and also handles stray surrounding quotes, CRLF
line endings, and a missing trailing newline. Without that conversion the SDK
fails with `Failed to parse private key: Invalid PEM formatted message`.

The key is validated at startup rather than on first use, so a malformed value
fails the boot with a message naming the likely cause — not a confusing `500`
on a user's first login.

If any of the three variables is missing the API still boots (so `/health` and
local schema work function), but every authenticated route responds `503`. This
is logged loudly at startup. A partial credential set counts as unconfigured:
all three are required together.

**Never expose these to the browser.** The private key can mint tokens for any
user in the project. `.gitignore` blocks `.env`, `*-service-account*.json` and
`firebase-adminsdk*.json` as a second line of defence.

---

## Authentication

Firebase owns the session lifecycle; the API only verifies tokens.

```
Browser
  └─ Firebase Auth (anonymous or Google)
       └─ ID token
            └─ Authorization: Bearer <token>
                 └─ FirebaseAuthGuard
                      └─ Admin SDK verifyIdToken()
                           └─ verified UID
                                └─ MongoDB user + workspace
                                     └─ authorised resource
```

**There is no `POST /auth/guest`.** Firebase Anonymous Authentication handles
guest login entirely in the browser. The server's entry point is
`GET /auth/me`, which verifies the token and — the first time a UID is seen —
provisions the user, a private workspace, the owner membership and a starter
set of labels. The operation is idempotent, so every later request simply finds
what already exists.

`POST /auth/logout` exists so the client has one endpoint to call on sign-out,
but it destroys nothing: the Firebase SDK discards the refresh token in the
browser, and there is no server-side session. The caller's current ID token
stays valid until it expires (up to an hour). Forcing immediate invalidation
would require revoking refresh tokens and enabling `checkRevoked` on every
request — a network round-trip to Firebase per call, which this application
does not need.

### Guest accounts

Anonymous accounts are bound to the browser's local storage. Clearing site data
or switching browsers produces a new Firebase UID and therefore a new, empty
workspace. This is inherent to anonymous authentication, not a defect.

### Token expiry

Firebase ID tokens expire after one hour. The client is responsible for calling
`getIdToken()` before each request (the SDK returns a cached token and refreshes
only when it is close to expiring). The API distinguishes an expired token
(`TOKEN_EXPIRED`) from an invalid one (`TOKEN_INVALID`) so the client can retry
silently in the first case and prompt for sign-in in the second.

---

## Authorization

Every request resolves to a workspace, and every query is scoped to it:

```
verified UID → user → workspace membership → resource.workspaceId matches → allow
```

Three rules make this structural rather than a matter of remembering checks:

1. **Ownership fields are absent from every DTO.** `workspaceId` and
   `reporterId` do not exist on the input types, and the global
   `ValidationPipe` runs with `forbidNonWhitelisted: true` — a request that
   tries to send them is rejected with `400`, not silently ignored.
2. **The workspace is part of the query, not a follow-up check.** Services call
   `findOne({ _id, workspaceId })`, never `findById(id)` followed by an `if`.
   A cross-workspace read cannot succeed even if a check were forgotten.
3. **Missing and foreign resources both return `404`.** Responding `403` would
   confirm that an id exists in someone else's workspace.

Comment deletion adds one further check: the caller must be the author.

---

## API reference

Base URL: `http://localhost:4000/api`
All routes require `Authorization: Bearer <firebase-id-token>` except `/health`.

### Response envelope

Single resource:

```json
{ "data": { "id": "...", "title": "..." } }
```

Collection:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 25, "total": 100, "totalPages": 4 }
}
```

Error:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": ["title should not be empty"],
  "path": "/api/tasks",
  "timestamp": "2026-08-08T12:00:00.000Z"
}
```

`code` values: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `TOKEN_EXPIRED`,
`TOKEN_INVALID`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`,
`INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness + MongoDB ping (public) |
| `GET` | `/auth/me` | Current session; provisions on first call |
| `POST` | `/auth/logout` | Acknowledges sign-out; Firebase clears the session client-side |
| `GET` | `/users/me` | Current profile |
| `PATCH` | `/users/me` | Update name, title, username, avatar |
| `GET` | `/users` | Assignable users in the workspace |
| `GET` | `/workspaces/me` | Current workspace |
| `GET` | `/workspaces/me/members` | Workspace access list |
| `POST` | `/workspaces/me/leave` | Leave workspace |
| `GET` | `/labels` | List labels |
| `POST` | `/labels` | Create label |
| `PATCH` | `/labels/:id` | Update label |
| `DELETE` | `/labels/:id` | Delete label |
| `GET` | `/projects` | List projects (search, priority, pagination) |
| `POST` | `/projects` | Create project |
| `GET` | `/projects/:id` | Project detail with task count |
| `PATCH` | `/projects/:id` | Update project |
| `DELETE` | `/projects/:id` | Delete project (tasks are detached, not deleted) |
| `GET` | `/tasks` | List tasks (see filters below) |
| `POST` | `/tasks` | Create task |
| `GET` | `/tasks/:id` | Task detail |
| `PATCH` | `/tasks/:id` | Update any field, including status |
| `DELETE` | `/tasks/:id` | Delete task and its children |
| `GET` | `/tasks/:taskId/subtasks` | List subtasks |
| `POST` | `/tasks/:taskId/subtasks` | Create subtask |
| `PATCH` | `/subtasks/:id` | Update subtask |
| `DELETE` | `/subtasks/:id` | Delete subtask |
| `GET` | `/tasks/:taskId/comments` | List comments (newest first) |
| `POST` | `/tasks/:taskId/comments` | Add comment |
| `DELETE` | `/comments/:id` | Delete own comment |
| `GET` | `/tasks/:taskId/activity` | Task history (newest first) |

### Task filters

`GET /tasks` accepts every facet in the design's Fields menu. Array parameters
accept either repeated keys (`?status=TODO&status=DOING`) or a comma-separated
list (`?status=TODO,DOING`).

| Parameter | Type | Notes |
| --- | --- | --- |
| `search` | string | Matches title, description and label names |
| `status` | enum[] | `TODO`, `DOING`, `COMPLETED`, `ON_HOLD` |
| `priority` | enum[] | `NONE`, `URGENT`, `HIGH`, `MEDIUM`, `LOW` |
| `memberId` | id[] | Assignee filter |
| `labelId` | id[] | Label filter |
| `reporterId` | id | Reporter filter |
| `projectId` | id | Project filter |
| `dueFrom` / `dueTo` | ISO date | Inclusive due-date range |
| `sort` | enum | `createdAt`, `updatedAt`, `dueDate`, `priority`, `title` |
| `order` | enum | `asc`, `desc` |
| `page` / `limit` | int | `limit` capped at 100 |

Example:

```
GET /api/tasks?status=TODO,DOING&priority=HIGH&search=landing&sort=dueDate&order=asc
```

Moving a card between board columns is an ordinary update:

```
PATCH /api/tasks/:id     { "status": "DOING" }
```

---

## Data model

Eight collections. There is deliberately no `sessions` collection — Firebase
owns session state.

```
users              firebaseUid (unique), email, displayName, avatarUrl, title,
                   username, isAnonymous, provider
workspaces         name, createdBy
workspace_members  workspaceId, userId, role          (unique per pair)
labels             workspaceId, name (unique per workspace), color
projects           workspaceId, name, description, priority, leadId, dueDate
tasks              workspaceId, projectId, title, description, status,
                   priority, reporterId, memberIds[], labelIds[], teamIds[],
                   dueDate, resources[], completedAt
subtasks           taskId, workspaceId, title, status, priority, memberId,
                   dueDate, order
comments           taskId, workspaceId, authorId, body
activities         taskId, workspaceId, actorId, type, metadata   (append-only)
```

### Design decisions worth explaining

**`workspaceId` is denormalised onto subtasks, comments and activities.** It
costs one field and turns every authorization check into a single indexed query
instead of a lookup back through the parent task.

**Subtasks are a separate collection, not embedded.** They carry their own
status, priority, assignee and due date and are updated individually, so
separate documents keep partial updates simple and avoid unbounded parent
growth.

**Deletion is asymmetric, deliberately.** Deleting a task removes its subtasks,
comments and activity, which are meaningless without it. Deleting a *project*
only detaches its tasks — losing a project should not silently destroy the work
tracked inside it.

**Activity is append-only.** No service exposes an update or delete path; an
audit trail that can be rewritten is not an audit trail. Activity writes are
also non-fatal: a logging failure is recorded server-side but never rolls back
or fails the user's actual mutation.

### Indexes

Every task index leads with `workspaceId`, because no query ever crosses a
workspace boundary.

```
tasks              { workspaceId, status }      { workspaceId, projectId }
                   { workspaceId, dueDate }     { workspaceId, updatedAt }
                   { workspaceId, memberIds }   text index on title/description
users              { firebaseUid } unique   { email } sparse
                   { username } unique sparse
workspace_members  { workspaceId, userId } unique
labels             { workspaceId, name } unique
subtasks           { taskId, order, createdAt }
comments           { taskId, createdAt }
activities         { taskId, createdAt }
```

---

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev:api` | Start the API in watch mode |
| `pnpm build` | Build the shared package, then the API |
| `pnpm typecheck` | Type-check every package |
| `pnpm lint` | ESLint with zero-warning tolerance |
| `pnpm test` | Unit tests |
| `pnpm seed` | Populate a demo workspace |
| `pnpm format` | Prettier across the repo |

---

## Testing

```bash
pnpm test
```

35 unit tests currently pass, covering the logic where a mistake would be both
easy to make and hard to notice:

- **`tasks.service.spec.ts`** — that every query carries the workspace scope,
  that filters layer on top of it rather than replacing it, that the reporter is
  taken from the session rather than the request body, and that search terms are
  escaped.
- **`activity-diff.spec.ts`** — which field changes produce which events, plus
  the real edge cases: equal dates as distinct objects, and order-insensitive
  member/label comparison.
- **`pagination.dto.spec.ts`** — query-string coercion, the limit cap, and
  page-count arithmetic.
- **`regex.util.spec.ts`** — that user search input cannot inject a wildcard or
  a catastrophically backtracking pattern.

Integration tests against a real database are **not** included yet; see
[Known gaps](#known-gaps).

---

## Verification status

What has been confirmed by running it, not by inspection:

### Backend

| Check | Result |
| --- | --- |
| `pnpm lint` | Passes, zero warnings |
| `pnpm typecheck` | Passes, zero errors |
| `pnpm test` | 228/228 tests pass across 18 suites |
| `pnpm build` | Emits `apps/api/dist/main.js` |
| MongoDB Atlas | Connects; `/api/health` reports `database: up` |
| Firebase Admin | Initialises for `ablespace-c0b4d`; rejects invalid tokens |
| Route registration | 22/22 specified routes register at the expected paths |
| Protected routes | Return `401` unauthenticated, `404` for another workspace's ids |

Filtering and search were exercised against the running API with 11 seeded
tasks, stubbing only Firebase token verification so the guard, provisioning,
DTO validation, service layer and database all ran for real:

| Query | Result |
| --- | --- |
| `?status=TODO&priority=HIGH` | 11 → 1 |
| `?status=TODO,DOING` | 11 → 6 |
| `?search=Documentation` | 1 — matched on title |
| `?search=sandbox` | 1 — matched on description only |
| `?search=Design` | 2 — matched on label name |
| `?status=DOING&search=Login` | 1 — combined |
| `?status=NOPE`, `?sortBy=title` | `400` — rejected |

### Frontend

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passes, zero errors |
| `next lint --max-warnings 0` | Passes, zero warnings |
| `next build` | Compiles; all 8 routes build |

**Not verified in this environment:** the application rendered in a browser.
Guest sign-in requires Anonymous authentication to be enabled in the Firebase
console, which it is not on the project as supplied, so the authenticated
screens could not be exercised end to end from here. The API side of that flow
*is* verified — token verification, just-in-time provisioning, workspace
creation and every endpoint the client calls.

---

## Known gaps

Stated plainly rather than left to be discovered:

1. **The UI does not match the Figma.** The design file is login-gated and no
   screenshots were supplied, so every screen was built from the PRD's prose.
   Structure and behaviour follow the brief; spacing, type scale and exact
   colours are an interpretation. See
   [Intentional deviations](#intentional-deviations-from-the-supplied-documents)
   — this is the most significant gap in the project.
2. **Anonymous sign-in is disabled on the Firebase project as supplied.** Guest
   login therefore cannot complete until it is enabled in the console. The code
   path is finished and the error is surfaced to the user, not swallowed.
3. **The client has not been exercised in a browser.** Blocked by (2) in this
   environment. The API half of every flow is verified.
4. **No frontend tests, and no backend integration or E2E tests.**
   `mongodb-memory-server` could not download its MongoDB binary here, so the
   backend suite is unit-level (228 tests). The intended integration coverage is
   specified in `docs/PROJECT_PLAN.md` §18.
5. **No drag and drop on the board.** Status changes go through a menu, which
   is keyboard- and touch-accessible; the PRD lists dragging as an optional
   enhancement.
6. **Not deployed.** The assessment requires a live URL; that step has not been
   run.

---

## Intentional deviations from the supplied documents

The assessment asks for deviations to be documented.

**Authentication replaces the design in `docs/SYSTEM_ARCHITECTURE.md` §16.**
That document specifies a custom NestJS session with an HTTP-only cookie and a
`sessions` collection. The implementation uses Firebase Authentication instead,
per the later and more specific project instruction. Consequences:

- The `sessions` collection does not exist.
- `POST /auth/guest` and `POST /auth/logout` do not exist; sign-in and sign-out
  are client-side Firebase operations.
- `GET /auth/me` absorbs their role as the provisioning trigger.
- The "HTTP-only auth cookie" security item is replaced by "verify the ID token
  server-side on every request, and never trust a client-supplied UID".

**Google sign-in is fully supported, not UI-only.** `docs/PRD.md` §4.2 treats it
as optional; Firebase makes it the same code path as anonymous sign-in, so
supporting it properly costs nothing extra.

**"Teams" is modelled as string tags.** The PRD surfaces Teams on the task
detail panel but defines no team entity, so this is the smallest implementation
that satisfies the requirement.

**Task search uses a regex rather than the `$text` index.** The text index is
defined on the schema, but search uses an escaped, case-insensitive regex
because the UI expects substring matching as the user types — `$text` is
word-and-stem based and would not match `api` inside `rapid`. At assessment
data volumes this is the correct trade-off; at large scale, Atlas Search would
be the right replacement.

### Frontend

**The visual design is an interpretation, not a reproduction of the Figma.**
This is the most significant deviation in the project and it deserves to be
stated plainly.

The Figma file referenced by the assessment
(`figma.com/design/obONCFmoTFN27V5H9PHS2X/Assessment-Task`) requires an
authenticated session; fetching it returns a login shell with no design data.
No screenshots or exported frames were supplied with the repository. Every
screen was therefore built from the prose descriptions in `docs/PRD.md` — for
example §26's "thin borders, compact SaaS controls, small rounded corners,
muted secondary text".

What that means in practice:

- **Structure, hierarchy and behaviour follow the specification.** The screens,
  their components, the fields on each, and the interactions between them are
  as described.
- **Exact spacing, type scale, colour values, border radii and icon choices are
  my own.** They will not match the Figma pixel for pixel.

The design system is built to make this correctable cheaply: every colour
resolves through a semantic CSS variable and the type and radius scales are
defined once in `tailwind.config.ts`. Retrofitting the real values is an edit
to those token definitions, not a rewrite of the components.

**Guest login requires Anonymous sign-in to be enabled in the Firebase
console.** It is disabled on the project as supplied — `signInAnonymously`
returns `auth/admin-restricted-operation`. The code is complete and the failure
is surfaced to the user rather than swallowed, but the toggle at
Firebase Console → Authentication → Sign-in method → Anonymous must be on for
"Continue as Guest" to work.

**Email sign-in is shown but disabled.** The design includes an email field, so
it is rendered, but no password provider is enabled on the Firebase project.
Rather than fail on submit, the field is disabled and explains why.

**Task status changes use a menu rather than drag and drop.** The PRD lists
drag and drop as a recommended enhancement "if it can be implemented reliably
without compromising accessibility". A "Move to" submenu is keyboard- and
touch-accessible; if dragging is added later it calls the same `PATCH
/tasks/:id`.

**Profile picture is set by URL, not upload.** There is no file storage in this
system, and an upload control would promise one that does not exist.

**"Teams" and "Reporter" are read-only on the task detail panel.** Reporter is
assigned by the server from the verified session. Teams has no entity to pick
from, so an editor over an empty list would imply a feature that does not
exist.

---

## Security notes

- All input validated by DTOs; unknown properties rejected outright.
- Ownership fields never accepted from the client.
- Every query scoped by workspace at the query level.
- `helmet` for security headers; explicit CORS allowlist, never a wildcard.
- Rate limiting ahead of token verification, so an unauthenticated flood is
  rejected cheaply.
- Regex metacharacters escaped in all user-supplied search input.
- Stack traces logged server-side, never returned to clients.
- `.env` and any `*-service-account*.json` are gitignored.

**If the MongoDB password was ever shared outside a secret store, rotate it in
Atlas.** The Firebase *web* config is public by design and safe to commit; the
Admin *service account* key is not, and must never enter the repository.

---

## Deployment

| Component | Target |
| --- | --- |
| API | Render / Railway / Fly.io |
| Database | MongoDB Atlas |
| Auth | Firebase (Anonymous + Google enabled) |
| Web | Vercel — *pending* |

Checklist:

1. Set every environment variable listed above on the host.
2. Add the deployed web origin to `CORS_ORIGIN`. Production refuses to start
   without it, and rejects `*`.
3. Add the deployed web domain to Firebase → Authentication → Authorized
   domains, or Google sign-in fails silently.
4. Allow the API host's egress IPs in Atlas Network Access.
5. Confirm `GET /api/health` returns `200`.
6. Run `pnpm seed` against production so a reviewer sees a populated board.

Free-tier hosts sleep when idle, and the assessment rejects non-working URLs —
either use a paid instance or keep the service warm.

---

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product requirements
- [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) — architecture
- [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) — phased delivery plan
- [`docs/TASKS.md`](docs/TASKS.md) — task breakdown
