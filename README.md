# UpNext

UpNext is a stack-based productivity app for deciding what to do next, not just storing a long checklist.

The app organizes recurring work into a daily stack. Mandatory tasks stay visible until completed, grouped tasks rotate after completion, and task playbooks keep execution notes close at hand. UpNext also tracks one-off action items, scheduled commitments, task history, and downtime for sleep, social plans, eating, and other non-task life needs. The dashboard brings those signals together so the app can show both progress and the real amount of flexible time available in a day.

## Features

- Email and password sign up / login
- Daily task stack for the signed-in user
- Mandatory tasks that stay prioritized until completed
- Task groups for rotating recurring work
- Task playbooks for tips, steps, mindset cues, and mistakes to avoid
- Playbook modal available from task cards and task management
- One-off action items for async errands or tasks outside the recurring stack
- Scheduled commitments for events, appointments, errands, and time-based obligations
- Dashboard with completion trends, downtime charts, scheduled load, action item status, and playbook coverage
- Completed Today section with same-day undo
- History page for browsing completed tasks by day
- Recent completed-day shortcuts with app-day aggregation
- Eastern-time app day handling for daily rollover
- Task completion history stored for analytics
- Downtime timer for sleep, social, eating, and other time
- Downtime sessions continue running after leaving the page
- Active downtime sessions split cleanly at Eastern midnight
- Responsive mobile navigation with a side menu
- Soft deletes for tasks and groups
- CI checks for linting, types, tests, unused code, and production build

## How It Works

UpNext treats productivity as a stack instead of a flat list.

Mandatory tasks appear first because they are expected every day. Non-mandatory tasks can belong to groups, such as Career, Health, or Study. When a grouped task is completed, it moves into Completed Today and returns the next day at the bottom of its group stack.

Example:

```text
Career stack
1. Work on portfolio project
2. Complete a LeetCode question
3. Apply to jobs
```

After completing `Work on portfolio project`, tomorrow's stack becomes:

```text
Career stack
1. Complete a LeetCode question
2. Apply to jobs
3. Work on portfolio project
```

This makes repeated work harder to avoid and helps rotate attention across important areas.

## Task Playbooks

Task descriptions stay short and card-facing. Playbooks are separate notes for how to perform a task well.

For example, a task like `Go to work function` might have a brief description:

```text
Attend the networking event after work.
```

And a playbook:

```text
- Stand up straight
- Smile before entering conversations
- Ask people what they are working on
- Keep answers concise and positive
- Do not check your phone
```

Playbooks can be added or edited from the Tasks page. Task cards show a Playbook button that opens the notes in a modal without navigating away from the current page.

## Completion History

The History page lets users review completed tasks by day. It includes:

- Previous Day and Next Day navigation
- A Today shortcut
- Recent completed-day shortcuts
- Sorted completed task cards for the selected day
- App-day aggregation for older completion timestamps

History uses the same Eastern-time app-day logic as Today, so task completions are grouped by the day the app considers active rather than by the server's raw UTC date.

## Action Items and Commitments

Recurring improvement work belongs in the daily task stack. One-off async work belongs in Action Items. Time-based obligations belong in Commitments.

Action Items are for tasks that need to happen once but do not require a specific time, such as:

```text
Return package
Call pharmacy
Submit reimbursement form
```

They can include an optional due date, description, and playbook. Open action items appear on Today when they are unscheduled, due today, or overdue.

Commitments are for scheduled or date-based obligations, such as:

```text
Dentist appointment
Work function
Interview
Grocery pickup
```

They can include a date, optional start and end time, location, description, and playbook. Commitments for the current app day appear in Today under Scheduled Today.

## Downtime Tracking

The downtime page tracks time spent away from improvement activities. A user can start a timer for:

- Sleep
- Social
- Eating
- Other

The timer keeps running if the user navigates away. When stopped, the session is saved to the database. If an active timer crosses the app-day boundary, UpNext closes the previous day's session at Eastern midnight and starts a new session for the new day.

This data is intended for future analytics around available free time, routines, and opportunities to adjust how time is spent.

## Analytics Dashboard

The Dashboard page summarizes recent app activity across the last 14 app days. It includes:

- Task completion rate
- Daily completion trend
- Completion breakdown by task area or group
- Downtime logged by day and category
- Scheduled commitment load
- Action item open, overdue, completed, and canceled counts
- Playbook coverage across tasks, action items, and commitments
- Most completed tasks

The dashboard uses existing database records rather than separate analytics tables, so it updates as tasks are completed, downtime sessions are logged, action items are resolved, and commitments are created or completed.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- NextAuth
- Vitest
- Testing Library
- Vercel-ready build

## Data Models

- `User` stores account data.
- `TaskGroup` stores related task groups.
- `Task` stores recurring tasks, mandatory status, group membership, stack order, and optional playbook notes.
- `TaskCompletion` stores per-day task completion history.
- `DowntimeSession` stores timed sleep, social, eating, and other sessions.
- `ActionItem` stores one-off async tasks with optional due dates, completion status, cancellation status, and playbook notes.
- `Commitment` stores date-based or time-based obligations with optional location, start/end times, completion status, cancellation status, and playbook notes.

## Getting Started

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

If `.env.example` is not present yet, create `.env` with:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
```

Apply database migrations:

```bash
npx prisma migrate dev
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Quality Checks

Run the full local check set:

```bash
npm run lint
npm run typecheck
npm run unused
npm run test:run
npm run build
```

For test watch mode:

```bash
npm test
```

## Database Migrations

Local development uses:

```bash
npx prisma migrate dev
```

Production deployments should use:

```bash
npx prisma migrate deploy
```

Do not use `prisma migrate dev` in production.

## GitHub Actions

The CI workflow runs on pull requests and pushes to `main`. It installs dependencies, then runs:

- ESLint
- TypeScript typecheck
- Knip unused-code check
- Vitest test suite
- Production build

## Roadmap

- Weekly and monthly summaries
- Streak tracking
- Most skipped or neglected task insights
- More detailed available-time estimates
- Drag-and-drop task ordering
- Skip reasons
- Notifications and reminders
- Richer playbook formatting or reusable playbook templates

## Screenshots

### Today's Stack

![Today's Stack](public/readme/today.png)

### Analytics Dashboard

![Analytics Dashboard](public/readme/dashboard.png)

### Task Management

![Task Management](public/readme/tasks.png)
