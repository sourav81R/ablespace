AbleSpace Task Management System --- Project Plan

1. Objective

Deliver the AbleSpace assessment as a production-quality juniorfull-stack project using:

Next.js App Router

Tailwind CSS

NestJS

TypeScript

MongoDB

The plan prioritizes the assessment's scoring areas: design fidelity,frontend quality, backend quality, reusable components, architecture,responsiveness, product thinking, code quality, and maintainability.

2. Delivery Strategy

Build in vertical slices rather than completing all frontend screensfirst.

Each slice should be:

UI → API → Database → Validation → Error State → Responsive Check → Test → Commit

This prevents a static frontend from becoming disconnected from thebackend.

3. Phase 0 --- Repository and Design Audit

Goals

Inspect supplied Figma screenshots.

Identify reusable UI patterns.

Extract pages, states, menus, dialogs, and interactions.

Create design tokens.

Decide exact implementation boundaries.

Deliverables

Page inventory.

Component inventory.

Color/token inventory.

Responsive behavior notes.

Architecture baseline.

Checklist

Login.

App shell.

Sidebar.

Board.

List.

Fields menu.

Search.

Task detail.

Subtasks.

Comments.

Projects.

Profile.

Theme.

Color mode.

4. Phase 1 --- Monorepo/Foundation

Structure

ablespace-task-manager/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── shared/
│   └── eslint-config/
├── docs/
├── .github/
├── .env.example
├── README.md
├── package.json
└── ...

Deliverables

Package manager/workspaces.

TypeScript configuration.

ESLint.

Prettier.

Environment validation.

Git hooks if useful.

Basic CI.

Development scripts.

Exit criteria

Frontend starts.

Backend starts.

TypeScript passes.

Lint passes.

5. Phase 2 --- Database and Backend Foundation

NestJS modules

AuthModule
UsersModule
WorkspacesModule
ProjectsModule
TasksModule
SubtasksModule
CommentsModule
LabelsModule
ActivityModule
HealthModule

Deliverables

MongoDB connection.

Mongoose schemas.

DTO validation.

Global exception filter.

Request validation.

API response/error conventions.

Authentication/session strategy.

Seed script.

Exit criteria

API connects to MongoDB.

Seed creates demo workspace/project/tasks.

API health endpoint works.

Invalid payloads return useful validation errors.

6. Phase 3 --- Guest Authentication

Flow

Login
  ↓
Continue as Guest
  ↓
Create/find guest user
  ↓
Create workspace membership
  ↓
Create session
  ↓
Redirect /tasks

Deliverables

Guest endpoint.

Session/cookie.

Auth guard.

Current-user endpoint.

Logout.

Protected task/project APIs.

Exit criteria

Fresh browser can enter as guest.

Refresh preserves session.

Guest cannot access another workspace's records.

7. Phase 4 --- Design System

Create reusable primitives before building all pages.

Components

Button
Input
Textarea
Avatar
Badge
Dropdown
Popover
Dialog
Tooltip
Tabs
Table
Skeleton
Toast
EmptyState
ErrorState
DatePicker
Command/Search

Design tokens

background
foreground
muted
border
primary
accent
danger
success
warning
radius
shadow
spacing

Theme

Implement:

Light.

Dark.

Amber.

Blue.

Pink.

Rose.

Emerald.

Black.

Exit criteria

Tokens work globally.

No page hardcodes an unrelated color.

Theme persists after refresh.

8. Phase 5 --- Application Shell

Build

Sidebar.

Header.

Workspace navigation.

Mobile drawer.

User menu.

Theme menu.

Color menu.

Exit criteria

/tasks and /projects use the same shell.

Sidebar state is responsive.

Navigation is keyboard accessible.

9. Phase 6 --- Tasks MVP

Build the complete vertical task workflow.

Backend

Create.

Read.

Update.

Delete.

Status.

Priority.

Member.

Due date.

Labels.

Frontend

Board.

List.

Task card.

Add task.

Edit task.

Delete confirmation.

Status controls.

Exit criteria

A task created in the UI appears after refresh and remains in MongoDB.

10. Phase 7 --- Search and Filters

Implement:

Search
Priority
Members
Due Date
Labels
Status
Reporter

Use server-side filtering for scalable API behavior.

Exit criteria

Combined filters work.

Search is debounced.

Empty result state works.

Reset filters works.

11. Phase 8 --- Task Detail

Build the detailed task screen.

Sections

Description.

Properties.

Labels.

Resources.

Subtasks.

Comments.

Activity.

Right details panel.

Exit criteria

Every editable property persists.

12. Phase 9 --- Subtasks, Comments, Activity

Subtasks

Create.

Update.

Delete.

Status.

Member.

Due date.

Comments

Create.

Read.

Optional delete for own comment.

Activity

Record meaningful mutations.

Exit criteria

Refreshing the task detail page does not lose data.

13. Phase 10 --- Projects

Features

Project list.

Create.

Edit.

Delete.

Open project.

Project task view.

Exit criteria

Projects are real backend records, not hardcoded rows.

14. Phase 11 --- Profile and Settings

Features

Profile display.

Guest profile editing.

Workspace information.

Leave workspace.

Theme.

Color mode.

Exit criteria

Settings persist and do not break navigation.

15. Phase 12 --- Visual Fidelity Pass

Compare implementation against the supplied screenshots.

Review:

Widths.

Spacing.

Font scale.

Borders.

Radius.

Icon sizes.

Avatar sizes.

Row heights.

Button heights.

Dropdown alignment.

Sidebar width.

Table density.

Board column spacing.

Detail panel width.

Empty/loading states.

Do not start by changing functionality during this pass.

16. Phase 13 --- Responsive Pass

Test:

Desktop: 1440px+
Laptop: 1024–1439px
Tablet: 768–1023px
Mobile: 320–767px

Check:

Navigation.

Board.

Table.

Dialogs.

Dropdowns.

Task detail.

Profile.

Touch targets.

17. Phase 14 --- Quality and Security

Frontend

No console errors.

No hydration warnings.

No broken links.

No inaccessible icon-only controls.

No layout overflow.

Backend

DTO validation.

Auth guard.

Ownership checks.

CORS.

Rate limiting where appropriate.

Safe error responses.

Environment variables.

Database

Index workspaceId.

Index projectId.

Index status.

Index dueDate.

Index updatedAt.

Text/search strategy appropriate for task search.

18. Phase 15 --- Testing

Unit tests

Task service.

Project service.

Auth service.

Validation.

Theme utilities where useful.

Integration/API tests

Guest login.

Task CRUD.

Project CRUD.

Filters.

Task detail.

Comments.

Subtasks.

E2E

Minimum critical journey:

Login as Guest
→ Tasks
→ Create Task
→ Edit Task
→ Change Status
→ Open Detail
→ Add Subtask
→ Add Comment
→ Refresh
→ Verify persistence

19. Phase 16 --- Deployment

Recommended deployment approach:

Next.js → Vercel or equivalent
NestJS → Render/Railway/Fly.io/equivalent
MongoDB → MongoDB Atlas

Use whichever provider is reliable and accessible for the finalsubmission.

Deployment checklist

Production environment variables.

MongoDB production database.

CORS configured.

HTTPS.

Guest login works.

API reachable.

Frontend can reach API.

No localhost URLs.

Seed/demo data available.

Public URL verified.

20. Phase 17 --- Submission Preparation

The assessment requires:

Public GitHub repository.

Multiple small, meaningful commits.

Working deployed URL.

README.

Part 2 submission.

Deployment accessible for at least 45 days.

Suggested commit progression

chore: initialize monorepo
feat(api): add nestjs foundation
feat(api): add mongo schemas
feat(auth): add guest authentication
feat(ui): add design tokens
feat(ui): build application shell
feat(tasks): add task CRUD
feat(tasks): add board view
feat(tasks): add list view
feat(tasks): add search and filters
feat(tasks): add task details
feat(tasks): add subtasks comments and activity
feat(projects): add project management
feat(settings): add theme and color modes
feat(profile): add profile settings
test: add task api coverage
fix(ui): improve responsive layouts
docs: add setup and assessment notes

Avoid one huge "final project" commit.

21. Recommended Timeline

Day 1

Audit.

Architecture.

Repository.

Design tokens.

Backend foundation.

Day 2

Guest authentication.

Shell.

Database seed.

Task API.

Day 3

Board.

List.

Task CRUD.

Search/filter.

Day 4

Task detail.

Subtasks.

Comments.

Activity.

Day 5

Projects.

Profile.

Theme.

Color mode.

Day 6

Responsive pass.

Fidelity pass.

Accessibility.

Error/loading states.

Day 7

Tests.

Deployment.

README.

Part 2 document.

Final QA.

If additional time is available, use it for fidelity and reliabilityrather than adding unrelated features.

22. Risk Management

Risk                                Mitigation

Figma access unavailable            Use supplied screenshots as visualsource of truth

Scope creep                         Follow PRD acceptance criteria

Backend becomes disconnected        Build vertical slices

Theme causes hydration issues       Use CSS variables + hydration-safeinitialization

Mobile board becomes unusable       Horizontal board scroll with touchsupport

API security holes                  Workspace ownership checks on everymutation

Deployment failure                  Deploy early, not on final day

Huge Git commit                     Commit each meaningful verticalslice

23. Final Gate

Do not submit until all of the following pass:

npm/pnpm install
typecheck
lint
unit tests
API tests
E2E smoke test
production build
production deployment
manual visual comparison
mobile manual test