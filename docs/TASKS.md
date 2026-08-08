AbleSpace Task Management System --- Implementation Tasks

Status Legend

[ ] Not started

[~] In progress

[x] Completed

[!] Needs review

EPIC 0 --- Project Setup

0.1 Repository

Create repository.

Initialize workspace/monorepo.

Add frontend app.

Add NestJS API.

Add shared TypeScript package if needed.

Add .env.example.

Add README skeleton.

0.2 Tooling

TypeScript.

ESLint.

Prettier.

Formatting scripts.

Typecheck scripts.

Test scripts.

Production build scripts.

EPIC 1 --- Design System

1.1 Tokens

Background tokens.

Foreground tokens.

Border tokens.

Muted tokens.

Primary/accent tokens.

Success/warning/danger tokens.

Radius scale.

Shadow scale.

Typography scale.

1.2 Primitive Components

Button.

Input.

Textarea.

Avatar.

Badge.

Dropdown.

Popover.

Dialog.

Tooltip.

Tabs.

Table.

Skeleton.

Toast.

Empty state.

Error state.

Date picker.

1.3 Theme

Light mode.

Dark mode.

Theme persistence.

Hydration-safe initialization.

Accent Amber.

Accent Blue.

Accent Pink.

Accent Rose.

Accent Emerald.

Accent Black.

Accent persistence.

EPIC 2 --- Authentication

2.1 Login UI

Build centered login card.

Match typography.

Match spacing.

Add email input.

Add Continue as Guest.

Add Google login UI.

Add terms/privacy text.

Add responsive behavior.

2.2 Guest API

Create guest endpoint.

Find/create guest user.

Create workspace.

Create membership.

Issue session.

Add /auth/me.

Add logout.

2.3 Security

Auth guard.

Secure cookie configuration.

Workspace authorization.

Test unauthorized requests.

EPIC 3 --- Application Shell

Sidebar.

Workspace navigation.

Tasks navigation.

Projects navigation.

User menu.

Theme submenu.

Color submenu.

Settings navigation.

Mobile drawer.

Active route state.

Keyboard accessibility.

EPIC 4 --- Database

4.1 Schemas

User schema.

Workspace schema.

Workspace member schema.

Project schema.

Task schema.

Subtask schema.

Label schema.

Comment schema.

Activity schema.

Session schema.

4.2 Indexes

Workspace indexes.

Project indexes.

Task status index.

Due date index.

Updated-at index.

Search index/strategy.

4.3 Seed

Demo workspace.

Demo user.

Demo projects.

Demo tasks.

Demo subtasks.

Demo labels.

Demo comments.

Demo activity.

EPIC 5 --- Task API

GET tasks.

POST task.

GET task by ID.

PATCH task.

DELETE task.

DTO validation.

Ownership checks.

Status update.

Priority update.

Member update.

Due date update.

Label update.

Activity generation.

EPIC 6 --- Task Board

Board page.

Toolbar.

Search.

Fields button.

View switcher.

To Do column.

Doing column.

Completed column.

On Hold column.

Task card.

Add Task.

Card action menu.

Open task detail.

Responsive board scrolling.

Optional enhancement

Drag and drop status movement.

Keyboard-accessible alternative for status movement.

EPIC 7 --- Task List

List view.

Status sections.

Task column.

Priority column.

Members column.

Due Date column.

Actions column.

Add Task row/action.

Expand/collapse sections.

Responsive table strategy.

EPIC 8 --- Search and Filters

Search

Search input.

Debounce.

Search title.

Search description.

Search labels.

Empty search state.

Fields menu

Priority.

Members.

Due Date.

Labels.

Status.

Reporter.

UX

URL query synchronization.

Reset filters.

Filter chips if useful.

No-results state.

EPIC 9 --- Task Detail

Breadcrumb/back.

Task title.

Task description.

Properties.

Status selector.

Priority selector.

Members selector.

Dates.

Labels.

Teams.

Reporter.

Resources.

Subtasks.

Comments.

Activity.

Right details panel.

Responsive detail layout.

EPIC 10 --- Subtasks

GET subtasks.

Create subtask.

Update subtask.

Delete subtask.

Status.

Priority.

Member.

Due date.

Actions menu.

Persistence tests.

EPIC 11 --- Comments

Comment API.

Comment list.

Comment composer.

Author avatar.

Timestamp.

Submit loading state.

Error state.

Optional own-comment delete.

EPIC 12 --- Activity

Activity schema.

Create activity helper.

Task created event.

Task updated event.

Status changed event.

Priority changed event.

Member changed event.

Due date changed event.

Label changed event.

Comment added event.

Subtask added event.

Activity timeline UI.

EPIC 13 --- Projects

Project page.

Project table.

Project name.

Priority.

Lead.

Due date.

Actions.

Add Project.

Edit Project.

Delete Project.

Project detail.

Project task relationship.

EPIC 14 --- Profile / Settings

Profile page.

Profile picture.

Email.

Full name.

Title.

Username.

Workspace access.

Leave workspace.

Profile update API.

Responsive settings layout.

EPIC 15 --- UX States

For every major page:

Loading state.

Empty state.

Error state.

Retry action.

Mutation loading.

Success feedback.

Delete confirmation.

Disabled state.

EPIC 16 --- Accessibility

Keyboard navigation.

Focus styles.

Icon button labels.

Form labels.

Dialog accessibility.

Dropdown accessibility.

Escape handling.

Contrast check.

Reduced motion consideration.

EPIC 17 --- Responsive QA

1440px desktop.

1280px desktop.

1024px tablet/small desktop.

768px tablet.

390px mobile.

320px mobile.

No page overflow.

Sidebar works.

Board works.

List works.

Detail works.

Menus fit viewport.

Dialogs fit viewport.

EPIC 18 --- Testing

Unit

Auth service.

Task service.

Project service.

Validation.

Filter parsing.

API integration

Guest login.

Task CRUD.

Project CRUD.

Search.

Filters.

Subtasks.

Comments.

Activity.

E2E

Guest login → dashboard.

Create task.

Edit task.

Move task.

Open detail.

Add subtask.

Add comment.

Refresh.

Verify persistence.

Change theme.

Refresh.

Verify theme persistence.

EPIC 19 --- Visual Fidelity

Compare every major screen against the supplied Figma/screenshots.

Login.

Board.

List.

Filter menu.

Task detail.

Theme menu.

Color menu.

Projects.

Profile.

Inspect:

Typography.

Spacing.

Colors.

Borders.

Radius.

Icons.

Avatars.

Alignment.

Hover.

Focus.

Active states.

EPIC 20 --- Deployment

MongoDB production database.

API deployment.

Frontend deployment.

Production CORS.

Production environment variables.

HTTPS.

Guest login verified.

API connectivity verified.

No localhost references.

Live URL tested.

EPIC 21 --- Documentation

README.

Architecture overview.

Setup instructions.

Environment variables.

API overview.

Database overview.

Screenshots.

Intentional deviations.

Deployment URL.

Part 2 document.

AI usage disclosure/notes if appropriate.

EPIC 22 --- Final Submission Gate

Public GitHub repository.

Multiple meaningful commits.

Working live URL.

README.

Part 2 submission.

Deployment accessible for 45+ days.

Production build passes.

Typecheck passes.

Lint passes.

Tests pass.

No critical console errors.

No critical API errors.

Final visual comparison complete.

Recommended Execution Order

1. Setup
2. Design tokens
3. Backend/database
4. Guest auth
5. App shell
6. Task API
7. Board
8. List
9. Search/filter
10. Task detail
11. Subtasks
12. Comments
13. Activity
14. Projects
15. Profile/settings
16. Theme/color
17. Responsive
18. Accessibility
19. Testing
20. Deployment
21. Documentation
22. Part 2 submission
23. Final QA