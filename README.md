# UpNext

UpNext is a stack-based productivity app for deciding what to do next, not just storing a long checklist.

The app organizes recurring work into a daily stack. Mandatory tasks stay visible until completed, grouped tasks rotate after completion, and a downtime tracker captures time spent on sleep, social plans, eating, and other non-task life needs. Together, the app is meant to show both progress and the real amount of flexible time available in a day.

## Features

- Email and password sign up / login
- Daily task stack for the signed-in user
- Mandatory tasks that stay prioritized until completed
- Task groups for rotating recurring work
- Completed Today section with same-day undo
- Eastern-time app day handling for daily rollover
- Task completion history stored for analytics
- Downtime timer for sleep, social, eating, and other time
- Downtime sessions continue running after leaving the page
- Active downtime sessions split cleanly at Eastern midnight
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

## Downtime Tracking

The downtime page tracks time spent away from improvement activities. A user can start a timer for:

- Sleep
- Social
- Eating
- Other

The timer keeps running if the user navigates away. When stopped, the session is saved to the database. If an active timer crosses the app-day boundary, UpNext closes the previous day's session at Eastern midnight and starts a new session for the new day.

This data is intended for future analytics around available free time, routines, and opportunities to adjust how time is spent.

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
- `Task` stores recurring tasks, mandatory status, group membership, and stack order.
- `TaskCompletion` stores per-day task completion history.
- `DowntimeSession` stores timed sleep, social, eating, and other sessions.

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

## Screenshots To Add

Add screenshots to a `docs/screenshots/` folder and reference them from this README when ready.

Recommended screenshots:

- **Today page with an active stack**: show Current Priority, mandatory tasks, grouped tasks, and progress.
- **Completed Today section**: show one or more completed tasks and the Undo button.
- **Task management page**: show adding/editing tasks and groups.
- **Downtime page idle state**: show the Sleep, Social, Eating, and Other start buttons.
- **Downtime page running state**: show a visible active timer and Stop Timer button.
- **Downtime breakdown**: show category totals after at least one stopped session.
- **Login or sign-up page**: useful if presenting the app as a complete authenticated product.

Suggested filenames:

```text
docs/screenshots/today-stack.png
docs/screenshots/completed-today.png
docs/screenshots/tasks-management.png
docs/screenshots/downtime-idle.png
docs/screenshots/downtime-running.png
docs/screenshots/downtime-breakdown.png
docs/screenshots/login.png
```

Once screenshots exist, add them near the top of the README with Markdown image links:

```md
![Today stack](docs/screenshots/today-stack.png)
![Downtime timer](docs/screenshots/downtime-running.png)
```

## Roadmap

- Analytics dashboard for task completion and downtime trends
- Weekly and monthly summaries
- Streak tracking
- Most skipped or neglected task insights
- Charts for completed tasks and available time
- Drag-and-drop task ordering
- Skip reasons
- Notifications and reminders
- Mobile UI polish
