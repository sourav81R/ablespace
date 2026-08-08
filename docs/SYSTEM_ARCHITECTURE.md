AbleSpace Task Management System --- System Architecture

1. Architecture Goal

Create a maintainable full-stack SaaS-style application that separatesUI concerns from backend business logic while remaining simple enoughfor a junior developer to understand and explain.

Selected stack:

Frontend  : Next.js App Router + TypeScript + Tailwind CSS
Backend   : NestJS + TypeScript
Database  : MongoDB
Validation: NestJS DTOs / class-validator
API       : REST

2. High-Level Architecture

┌─────────────────────────────────────────────────────────┐
│                     Browser                             │
│                                                         │
│  Next.js App Router                                    │
│  ├── Server Components                                  │
│  ├── Client Components                                  │
│  ├── Tailwind Design System                             │
│  ├── Theme/Color Preference                             │
│  └── API Client / Query Cache                           │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     NestJS API                          │
│                                                         │
│  Auth ─ Users ─ Workspaces ─ Projects ─ Tasks           │
│                                │                         │
│             ┌──────────────────┼──────────────────┐      │
│             ▼                  ▼                  ▼      │
│          Subtasks           Comments           Activity  │
│                                                         │
│  Validation → Guards → Services → Repositories          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    MongoDB                              │
│                                                         │
│ users / workspaces / projects / tasks / comments        │
│ subtasks / labels / activities / sessions               │
└─────────────────────────────────────────────────────────┘

3. Repository Structure

ablespace-task-manager/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── tasks/
│   │   │   │   ├── projects/
│   │   │   │   └── settings/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── tasks/
│   │   │   ├── projects/
│   │   │   ├── profile/
│   │   │   └── settings/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── utils/
│   │   └── ...
│   │
│   └── api/
│       └── src/
│           ├── auth/
│           ├── users/
│           ├── workspaces/
│           ├── projects/
│           ├── tasks/
│           ├── subtasks/
│           ├── comments/
│           ├── labels/
│           ├── activity/
│           ├── common/
│           ├── database/
│           ├── app.module.ts
│           └── main.ts
│
├── packages/
│   └── shared/
│       ├── types/
│       └── constants/
│
├── docs/
├── .env.example
├── README.md
└── package.json

4. Frontend Architecture

Next.js App Router

Use route groups to keep authentication and dashboard layouts separate.

app/
├── (auth)/
│   └── login/
│       └── page.tsx
│
└── (dashboard)/
    ├── layout.tsx
    ├── tasks/
    │   ├── page.tsx
    │   └── [taskId]/
    │       └── page.tsx
    ├── projects/
    │   ├── page.tsx
    │   └── [projectId]/
    │       └── page.tsx
    └── settings/
        └── page.tsx

5. Component Architecture

Layout components

AppShell
├── Sidebar
├── MobileSidebar
├── TopBar
└── UserMenu

Task components

TaskWorkspace
├── TaskToolbar
│   ├── SearchInput
│   ├── FieldsMenu
│   └── ViewSwitcher
├── BoardView
│   └── TaskColumn
│       └── TaskCard
└── ListView
    ├── StatusSection
    └── TaskRow

Task detail

TaskDetail
├── TaskHeader
├── TaskDescription
├── PropertyList
├── ResourceList
├── SubtaskTable
├── CommentSection
├── ActivityFeed
└── TaskDetailsPanel

Reusable components should not contain unnecessary business logic.

6. State Management

Use a server-state/query layer for API data.

Recommended approach:

TanStack Query
    ↓
API client
    ↓
NestJS REST API

Use local React state for:

Dropdown open/close.

Modal state.

Form draft.

Temporary UI state.

Use persisted client preference for:

Theme.

Accent color.

Sidebar preference where appropriate.

Do not create a global state store for data that can safely remainserver state.

7. API Client

Centralize requests:

lib/api/
├── client.ts
├── auth.ts
├── tasks.ts
├── projects.ts
├── comments.ts
├── subtasks.ts
└── users.ts

The UI should never scatter raw fetch() calls across dozens ofcomponents.

8. Backend Architecture

NestJS follows:

Controller
   ↓
DTO / Validation
   ↓
Service
   ↓
Repository / Model
   ↓
MongoDB

Controllers should remain thin.

Business rules belong in services.

Database access belongs behind a consistent persistence boundary.

9. NestJS Modules

AuthModule

Responsibilities:

Guest login.

Session creation.

Current user.

Logout.

Optional Google OAuth integration.

UsersModule

Responsibilities:

Profile.

User lookup.

Workspace membership.

WorkspacesModule

Responsibilities:

Workspace lookup.

Membership.

Access checks.

ProjectsModule

Responsibilities:

Project CRUD.

Project authorization.

TasksModule

Responsibilities:

Task CRUD.

Search.

Filtering.

Status changes.

Priority.

Assignment.

Labels.

Activity generation.

SubtasksModule

Responsibilities:

Subtask CRUD.

Parent task authorization.

CommentsModule

Responsibilities:

Add/read comments.

Author authorization.

ActivityModule

Responsibilities:

Immutable activity records.

Task history.

10. MongoDB Collections

Recommended collections:

users
workspaces
workspace_members
projects
tasks
subtasks
comments
labels
activities
sessions

A MongoDB implementation may also embed small task-specific structureswhere it improves simplicity, but large/repeated relationships shouldnot create uncontrolled document growth.

11. Suggested Schemas

User

_id
email
name
avatarUrl
title
username
isGuest
createdAt
updatedAt

Workspace

_id
name
createdBy
createdAt
updatedAt

WorkspaceMember

_id
workspaceId
userId
role
createdAt

Project

_id
workspaceId
name
priority
leadId
dueDate
description
createdAt
updatedAt

Task

_id
workspaceId
projectId
title
description
status
priority
reporterId
memberIds[]
labelIds[]
teamIds[]
dueDate
resources[]
createdAt
updatedAt
completedAt

Subtask

_id
taskId
title
status
priority
memberId
dueDate
createdAt
updatedAt

Comment

_id
taskId
authorId
body
createdAt
updatedAt

Activity

_id
taskId
actorId
type
metadata
createdAt

12. Authorization Model

Every protected mutation must establish:

Authenticated user
        ↓
Workspace membership
        ↓
Resource belongs to workspace
        ↓
Permission allowed
        ↓
Mutation

Never accept workspaceId, reporterId, or ownership information fromthe browser as trusted authority.

The backend must derive/verify ownership.

13. REST API

Auth

POST /auth/guest
GET  /auth/me
POST /auth/logout

Projects

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

Tasks

GET    /tasks
POST   /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id

Query examples:

GET /tasks?search=api&status=TODO&priority=HIGH
GET /tasks?memberId=...
GET /tasks?labelId=...
GET /tasks?dueFrom=...&dueTo=...

Subtasks

GET    /tasks/:taskId/subtasks
POST   /tasks/:taskId/subtasks
PATCH  /subtasks/:id
DELETE /subtasks/:id

Comments

GET  /tasks/:taskId/comments
POST /tasks/:taskId/comments
DELETE /comments/:id

Activity

GET /tasks/:taskId/activity

Profile

GET   /users/me
PATCH /users/me

14. API Response Convention

Success:

{
  "data": {}
}

List:

{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 100
  }
}

Error:

{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": []
}

The exact implementation may vary, but the frontend must consume oneconsistent contract.

15. Theme Architecture

Use CSS variables:

:root {
  --background: ...;
  --foreground: ...;
  --primary: ...;
  --border: ...;
  --muted: ...;
}

.dark {
  --background: ...;
  --foreground: ...;
}

Accent themes should override semantic variables rather than replacingevery component's Tailwind classes.

Example concept:

accent-blue
  --primary
  --primary-foreground
  --ring
  --accent

16. Authentication Architecture

Preferred assessment flow:

Browser
  ↓
POST /auth/guest
  ↓
NestJS
  ├── create/find guest user
  ├── create workspace
  └── issue secure session
  ↓
HTTP-only cookie

The frontend then calls:

GET /auth/me

to hydrate the current user.

Do not store sensitive session credentials in localStorage.

17. Search Architecture

For the assessment-scale dataset:

User types
   ↓
Debounce ~250–400ms
   ↓
GET /tasks?search=...
   ↓
MongoDB indexed query
   ↓
Updated result set

Do not fetch every task on every keystroke without debounce.

18. Filtering Architecture

Filters are URL-friendly:

/tasks?status=TODO&priority=HIGH

Benefits:

Refresh-safe.

Shareable.

Browser back/forward works.

Easy debugging.

19. Board State

Board columns map directly to task status:

TODO       → To Do
DOING      → Doing
COMPLETED  → Completed
ON_HOLD    → On Hold

A drag/drop interaction, if implemented, should ultimately call:

PATCH /tasks/:id
{
  "status": "DOING"
}

The database remains the source of truth.

20. Error Boundary Strategy

Frontend:

app/error.tsx
app/not-found.tsx
route-level loading.tsx
component-level mutation errors

Backend:

ValidationPipe
GlobalExceptionFilter
Logging
Safe response mapping

Never expose stack traces in production.

21. Observability

For an assessment, keep it lightweight:

Structured server logs.

Request/error logging.

/health endpoint.

Frontend error boundary.

Production build verification.

Avoid adding complex infrastructure that is not needed for theassessment.

22. Security Checklist

[ ] HTTP-only auth cookie
[ ] Secure cookie in production
[ ] CORS allowlist
[ ] DTO validation
[ ] Workspace authorization
[ ] Ownership checks
[ ] Input length limits
[ ] Safe error messages
[ ] Environment secrets
[ ] No secrets committed
[ ] Production HTTPS

23. Deployment Architecture

                Internet
                   │
          ┌────────┴────────┐
          ▼                 ▼
     Next.js Web       NestJS API
      Hosting           Hosting
          │                 │
          └────────┬────────┘
                   ▼
              MongoDB Atlas

The deployed frontend should use a production API URL through anenvironment variable.

24. Architectural Principles

Backend is the source of truth.

Controllers stay thin.

Business rules stay in services.

Components stay reusable.

UI should not know database details.

Authentication and authorization are separate concerns.

Theme/color uses semantic tokens.

Every major mutation is validated.

Every important state has loading/error/empty UI.

Simplicity is preferred over unnecessary abstractio