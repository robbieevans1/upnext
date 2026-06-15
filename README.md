# UpNext

UpNext is a stack-based task management app designed to help users focus on the next most important task instead of managing a long, overwhelming checklist.

Unlike a traditional to-do list, UpNext organizes tasks into a daily stack. Mandatory tasks stay near the top until completed, while recurring tasks inside task groups rotate after completion. When a grouped task is completed, it moves into **Completed Today** and returns the next day at the bottom of its group stack.

## Features

- Create, edit, and delete tasks
- Create, edit, and delete task groups
- Mark tasks as complete for the current day
- Track daily task completions in the database
- Group related tasks into rotating stacks
- Keep mandatory tasks prioritized
- Store completion history for future analytics
- Soft-delete tasks and groups to preserve historical data

## Example Use Case

A user may have a task group called **Career** with these tasks:

1. Work on portfolio project
2. Complete a LeetCode question
3. Apply to jobs

If the user completes **Work on portfolio project**, it moves to **Completed Today** and disappears from the remaining stack for that day. The next day, it returns at the bottom of the Career stack:

1. Complete a LeetCode question
2. Apply to jobs
3. Work on portfolio project

This helps users rotate through important recurring work instead of repeatedly choosing the easiest task.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Neon
- Vercel

## Core Data Models

- `TaskGroup` — stores groups of related tasks
- `Task` — stores recurring tasks, mandatory status, group membership, and stack order
- `TaskCompletion` — stores which tasks were completed on each day
- `User` — stores user account data

## Why I Built This

Most to-do apps treat all tasks like a flat checklist. UpNext is designed around the idea that productivity is often about knowing what should come next. The app helps reduce avoidance by keeping important recurring tasks visible and rotating grouped tasks over time.

## Future Improvements

- User authentication
- Weekly and monthly analytics dashboard
- Streak tracking
- Most skipped task tracking
- Task completion charts
- Drag-and-drop task reordering
- Skip reasons
- Mobile-first improvements
- Notifications and reminders

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local quality checks:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

For active test development, use watch mode:

```bash
npm test
```

## GitHub Actions

This project runs CI from `.github/workflows/ci.yml` on pushes to `main` and on pull requests. The workflow installs dependencies with `npm ci`, then runs linting, TypeScript checks, the Vitest suite, and a production build.
