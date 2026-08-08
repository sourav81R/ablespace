AbleSpace Task Management System --- Product Requirements Document

1. Document Purpose

This PRD converts the AbleSpace Full Stack Developer (Fresher) technicalassessment and the supplied Figma/screenshots into animplementation-ready product specification.

The assessment explicitly evaluates frontend/backend engineering,attention to detail, product thinking, communication,software-engineering practices, design fidelity, theme support, guestlogin, reusable components, clean NestJS APIs, validation, projectstructure, and responsive UX.

Primary source: AbleSpace Assignment.pdf, pages 1--2.Design source: the supplied AbleSpace Assessment Figma file andscreenshots.

Note: the Figma page itself could not be programmatically inspectedfrom this environment because the shared design requiresbrowser/session access. Therefore, the supplied screenshots aretreated as the visual source of truth for the UI details that arevisible in this specification.

2. Assessment Requirements

Required technology

Layer                               Required / selected technology

Frontend                            Next.js, App Router preferred

Styling                             Tailwind CSS

Backend                             NestJS

Language                            TypeScript preferred

Database                            MongoDB selected for thisimplementation

Authentication                      Guest login required; Google-loginUI preserved from the design

API                                 RESTful NestJS API

Validation                          DTO validation on backend +client-side form validation

Deployment                          Public working deployment

The assessment permits MongoDB, PostgreSQL, SQLite, or another database.MongoDB is selected here because thetask/project/subtask/comment/activity model is naturallydocument-oriented and it keeps the implementation approachable for afresher while still demonstrating proper backend architecture.

3. Product Goal

Build a polished, responsive task/project management application thatclosely reproduces the supplied AbleSpace Figma experience while makingthe core flows genuinely functional end-to-end.

The application should feel like a real SaaS productivity product ratherthan a static Figma recreation.

Success criteria

A user can enter the product through Guest Login.

A user can create, view, edit, move, search, filter, and deletetasks.

Tasks can be viewed in Board and List layouts.

Task details support properties, labels, members, due dates,subtasks, resources, comments, and activity/history.

Projects can be listed and managed.

Theme selection works and persists after refresh.

Accent/color selection works and persists after refresh.

Profile/settings/sidebar interactions are functional.

UI is responsive on desktop, tablet, and mobile.

Backend APIs are validated and protected appropriately.

The application is deployable and documented.

The implementation is explainable during an interview.

4. Users

4.1 Guest User

A guest user is the primary assessment persona.

Capabilities:

Enter through the designed login screen.

Continue as Guest.

Use the task/project workspace.

Create and update demo data.

Search/filter tasks.

Change view, theme, and accent color.

Open task details.

Add comments/subtasks where permitted.

Manage personal settings.

A guest account should receive an isolated workspace so one guest cannotmodify another guest's data.

4.2 Future Authenticated User

The architecture should leave room for real email/password and Googleauthentication without forcing those integrations into the assessmentMVP.

The Google button should match the design. If OAuth credentials are notconfigured, the UI must provide a clear, non-breaking state rather thansilently failing.

5. Information Architecture

Authentication
└── Login
    └── Continue as Guest

Application Shell
├── Workspace
│   ├── Tasks
│   │   ├── Board View
│   │   └── List View
│   └── Projects
└── User Menu / Sidebar
    ├── Change Theme
    │   ├── Light
    │   └── Dark
    ├── Color Mode
    │   ├── Amber
    │   ├── Blue
    │   ├── Pink
    │   ├── Rose
    │   ├── Emerald
    │   └── Black
    └── Settings
        └── Profile

6. Core Screens

6.1 Login Screen

The screenshot shows a minimal centered authentication card.

Visual requirements

White/light neutral page background.

Centered login card.

Brand/logo treatment.

Heading similar to "Let's get back on track".

Email input.

Primary "Continue as Guest" action.

Google login action.

Terms/Privacy microcopy.

Strong but restrained green accent around the card/action in thesupplied design.

Responsive centered layout.

Functional requirements

Guest login must work without external credentials.

Generate a guest user/session.

Redirect authenticated guest to the task workspace.

Preserve session on refresh.

Invalid authentication states must be handled cleanly.

7. Application Shell

The supplied screenshots show a left navigation/sidebar with:

Brand/profile area.

Workspace section.

Tasks.

Projects.

User/profile menu.

Theme controls.

Color controls.

Settings.

Requirements

Sidebar is persistent on desktop.

Sidebar can collapse on smaller screens.

Mobile uses a drawer/sheet pattern.

Main content must resize correctly when the sidebar changes.

Active navigation state must be visually obvious.

No content may be clipped because of fixed-width navigation.

8. Tasks

8.1 Board View

The supplied Figma shows a Kanban-style board with columns:

To Do

Doing

Completed

On Hold

Each column contains task cards.

Task card information visible in the design

Task title.

Assignee/member avatar.

Due date.

Labels/tags.

Relevant metadata.

Action menu.

Add Task control.

Required interactions

Add task.

Open task.

Edit task.

Delete task.

Change status.

Assign member.

Set priority.

Set due date.

Add labels.

Search.

Filter.

Switch between Board and List.

Persist all changes through the backend.

Drag-and-drop is a recommended enhancement if it can be implementedreliably without compromising accessibility or stability.

9. Task List View

The supplied Figma shows a table-like list grouped by status.

Columns

Task

Priority

Members

Due Date

Actions

Requirements

Group tasks by status.

Expand/collapse status groups.

Search tasks.

Filter tasks.

Open actions menu.

Add task.

Open task detail.

Edit/delete task.

Responsive overflow handling.

10. Search and Filters

The screenshots show a search control and a Fields menu.

The Fields menu includes:

Priority

Members

Due Date

Labels

Status

Reporter

Requirements

Search should support:

Task title.

Task description.

Labels.

Filters should support:

Priority.

Member.

Due date.

Label.

Status.

Reporter.

The filter state should be reflected in the URL/query state wherepractical so refresh/back navigation remains understandable.

11. Task Detail

The supplied design includes a detailed task screen.

Header

Back/breadcrumb navigation.

Task title.

Lock/share/more/action controls where present.

Project/workspace context.

Main content

Description.

Properties.

Labels.

Resources.

Subtasks table.

Comments.

Comment composer.

Activity/update history.

Right-side details panel

Visible properties include:

Status.

Priority.

Members.

Dates.

Labels.

Teams.

Reporter.

Functional requirements

Every editable property must persist through the API.

12. Subtasks

A task may contain subtasks.

Each subtask should support:

Title.

Status.

Priority.

Member.

Due date.

Actions.

Users can:

Add subtask.

Update subtask.

Delete subtask.

Change status.

Open the parent task.

13. Comments and Activity

Comments

Users should be able to:

Add a comment.

View comments chronologically.

See author and timestamp.

Delete their own comment if the implementation supports it.

Activity

Record meaningful changes such as:

Task created.

Task title changed.

Status changed.

Priority changed.

Member changed.

Due date changed.

Label changed.

Comment added.

Subtask added.

This demonstrates real product thinking and backend persistence.

14. Projects

The supplied Figma includes a Projects screen.

Project table

Visible fields include:

Project name.

Priority.

Lead.

Due date.

Actions.

Requirements

List projects.

Create project.

Edit project.

Delete project when safe.

Open a project.

View project tasks.

Search/filter projects where practical.

15. Theme System

The Figma explicitly requires theme functionality and persistence.

Required themes

Light.

Dark.

Persistence

Selected theme must survive:

Page refresh.

Route changes.

Browser restart where local persistence is available.

Use a client-side preference store/localStorage with a hydration-safeimplementation.

Avoid flash-of-wrong-theme during initial render.

16. Accent / Color Mode

The supplied user menu includes a Color Mode submenu.

Visible options:

Amber

Blue

Pink

Rose

Emerald

Black

The selected accent should influence:

Primary buttons.

Focus rings.

Active navigation.

Selected controls.

Important interactive states.

The implementation should use CSS variables/design tokens instead ofscattered Tailwind color literals.

17. Profile / Settings

The supplied screenshot shows a Profile screen containing:

Profile picture.

Email.

Full name.

Title/role.

Username.

Workspace access.

Leave Workspace action.

MVP behavior

Show current guest profile.

Allow editable fields that are safe for guest mode.

Persist profile changes.

Show workspace membership.

Provide a safe leave-workspace action.

18. Responsive Requirements

The assessment explicitly requires desktop, tablet, and mobileresponsiveness.

Desktop

Full sidebar.

Multi-column board.

Wide task table.

Task detail with right panel.

Tablet

Collapsible sidebar.

Horizontal board scrolling where required.

Responsive task table.

Detail panel can become stacked/drawer content.

Mobile

Mobile navigation drawer.

Single-column task presentation.

Horizontally scrollable board columns/cards.

Table converts to cards or controlled horizontal scrolling.

Task detail becomes single-column.

Touch-friendly controls.

No horizontal page overflow.

19. Accessibility

Implement:

Semantic HTML.

Keyboard navigation.

Visible focus states.

Accessible dialogs/dropdowns.

ARIA labels for icon-only buttons.

Proper form labels.

Escape-to-close for menus/dialogs.

Sufficient contrast.

Reduced-motion consideration.

Buttons must have meaningful accessible names.

20. Error, Empty, and Loading States

Every major data surface must have:

Loading

Skeletons matching the approximate layout.

Empty

Examples:

No tasks.

No projects.

No search results.

No comments.

No subtasks.

Error

Clear human-readable message.

Retry action.

No raw server errors shown to users.

Mutation feedback

Disabled/loading action state.

Toast or inline confirmation.

Optimistic updates only where rollback is reliable.

21. Data Model

Recommended entities:

User
Workspace
Project
Task
Subtask
Label
Comment
Activity
Session

Relationships:

User ──< WorkspaceMember >── Workspace
Workspace ──< Project
Workspace ──< Task
Project ──< Task
Task ──< Subtask
Task ──< Comment
Task ──< Activity
Task ──< LabelAssignment

22. Task Fields

Recommended task shape:

id
workspaceId
projectId
title
description
status
priority
reporterId
memberIds[]
dueDate
labelIds[]
teamIds[]
resourceLinks[]
createdAt
updatedAt
completedAt

Status:

TODO
DOING
COMPLETED
ON_HOLD

Priority:

NONE
URGENT
HIGH
MEDIUM
LOW

23. Non-Functional Requirements

Performance

Avoid unnecessary client rendering.

Use server components for static/server-readable content whereuseful.

Keep interactive task controls client-side.

Paginate large API responses.

Debounce search.

Avoid N+1 API patterns.

Security

Validate all request DTOs.

Never trust client-provided workspace/user ownership.

Protect task/project mutations.

Sanitize/validate user input.

Do not expose secrets.

Configure CORS explicitly.

Use secure cookies/session strategy for production.

Maintainability

Feature-oriented modules.

Reusable UI components.

Typed API contracts.

Centralized error handling.

Consistent naming.

Small meaningful Git commits.

24. Acceptance Criteria

The project is ready for submission only when:

Login page visually matches the supplied design.

Guest Login works.

Task Board works.

Task List works.

Task CRUD works.

Task status/priority/member/due date/labels work.

Search works.

Fields filter works.

Task detail works.

Subtasks work.

Comments work.

Activity history works.

Projects work.

Theme switching works.

Theme persists.

Color mode works.

Profile/settings work.

Desktop/tablet/mobile layouts work.

API validation works.

Database persistence works.

Loading/error/empty states exist.

README explains setup and intentional deviations.

Public GitHub repository is available.

Live deployment works.

Part 2 product-understanding submission is included.

Repository contains multiple small, meaningful commits.

Deployment remains accessible for at least 45 days.

25. Part 2 --- Product Understanding Requirement

The assessment separately asks the candidate to explore the AbleSpaceTake Data screen from the Caseload tab and submit either:

A document with screenshots explaining the workflow in thecandidate's own words, or

A video walkthrough.

The supplied PDF screenshot shows a Caseload table with a Take Dataaction for students.

This is not the same feature as the Task Management System andshould not be fabricated into the application unless the companyspecifically requests it.

A separate Part 2 document should explain:

What the Caseload screen appears to do.

The user flow from selecting a student to using Take Data.

What information is visible before the action.

What could be improved.

Any assumptions clearly labeled as assumptions.

26. Design Fidelity Rule

Do not redesign the Figma.

Implement the existing visual language:

Minimal white/light surfaces.

Thin borders.

Compact SaaS controls.

Small rounded corners.

Subtle shadows.

Muted secondary text.

Compact typography.

Avatar-based member representation.

Status/priority colors.

Left navigation.

Dense task tables.

Board/list switching.

Context menus.

Right-side task details.

Any deviation must be documented in README as required by theassessment.

27. Definition of Done

The product is considered complete when a reviewer can clone therepository, configure environment variables, run frontend and backend,use Guest Login, perform the main task/project workflows, switchthemes/colors, resize to mobile, and verify that the UI closely matchesthe supplied Figma without encountering broken buttons, dead-endscreens, fake persistence, or console/runtime errors.