# UpNext

UpNext is a stack-based productivity app for deciding what to do next, not just storing a long checklist.

The app organizes recurring work into a daily stack. Mandatory tasks stay visible until completed, grouped tasks rotate after completion, subtasks break larger work into smaller steps, and task playbooks keep execution notes close at hand. UpNext also tracks one-off action items, scheduled commitments, task history, task timer sessions, and time away for sleep, social plans, eating, and other non-task life needs. The dashboard brings those signals together so the app can show both progress and the real amount of flexible time available in a day.

## Features

- **Task stack:** mandatory tasks, rotating groups, subtasks, task timers, task skips, completed-task continuation, playbooks, collapsible Today sections, and the Complete Day early-start flow.
- **Planning:** one-off action items, scheduled and recurring commitments, monthly calendar, future announcement banners, and responsive navigation.
- **Review and history:** day and week history views, recent day shortcuts, Daily Review checks, Weekly Review reflection prompts, Eastern-time app-day grouping, and soft-delete-aware reporting.
- **Time and health:** downtime tracking, flexible timer, Pomodoro timer, scratch counter, calorie logging, daily weight, starting-weight baseline, fasting sessions, and weight comparisons.
- **Notes:** reusable Topics, full-page topic editor, and topic image montages with upload, paste, captions, alt text, and delete support.
- **Analytics:** dashboard charts for completions, task time, downtime, scheduled load, action items, Daily Review outcomes, playbook coverage, and weekly task totals.
- **App basics:** email/password auth with password reset, public About page, toast notifications, demo seed data, PostgreSQL persistence, and CI checks for linting, types, tests, unused code, and production build.

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

## Task Timers and Subtasks

Tasks can be timed directly from the Today page. Pressing Start begins a focused task session and pauses the default Other time-away timer. Pressing Complete stops the task session, records the task as completed for the current app day, and returns time tracking to Other.

Completed tasks can still be continued. If a task like `Read` is completed after 30 minutes, the user can press Continue later, read for another 30 minutes, and then press Stop. The task remains completed, but the dashboard records one hour of task time because both sessions belong to the same task.

Tasks can also have subtasks. Subtasks are useful for breaking the task into smaller steps, such as:

```text
Portfolio project
- Pick issue
- Implement slice
- Run tests
- Write notes
```

Subtasks can be checked off one by one and move toward the bottom of the task card. Completing every subtask is not required before completing the parent task, which keeps the workflow flexible for real days.

On Today, task cards with subtasks can collapse their subtask list so large tasks do not take over the whole page. The card still shows subtask progress while collapsed.

Tasks can also be skipped for the current app day. Skipping is useful for days when a task is not realistic, such as being too sore to train or unable to get out of the house. A skip removes the task from the active Today stack and shows it under Skipped Today, but it does not create a completion, does not update the last-completed date, and does not rotate the grouped task to the bottom. Undo Skip returns the task to the active stack for that same day.

## Task Playbooks

Task descriptions stay short and card-facing. Playbooks are separate notes for how to perform a task well.

For example, a task like `Interview` might have a brief description:

```text
Interview Reminders.
```

And a playbook:

```text
- Sit up straight
- Use Star format when answering questions
- Ask interviewer questions
- Keep answers concise and positive
```

Playbooks can be added or edited from the Tasks page. Task cards show a Playbook button that opens the notes in a large modal without navigating away from the current page. On Today, task Playbook buttons are highlighted when notes already exist, making tasks with execution guidance easier to spot. Task playbooks can also be edited and saved directly from that modal on Today, so useful notes can be improved at the moment they are needed.

## Starting Tomorrow Early

The Today page includes a Complete Day flow for unusual schedules. If a user wakes up late in the evening and wants to treat the next calendar day as active, they can confirm the action and start tomorrow's stack early.

This does not complete unfinished tasks. It only changes the user's effective app day to tomorrow until real Eastern midnight arrives. The action is limited to one day ahead, so repeated clicks cannot jump multiple days forward.

## Completion History

The History page lets users review completed work by day, week, or all-time current task totals. The day view includes:

- Previous Day and Next Day navigation
- A Today shortcut
- Recent completed-day shortcuts
- Sorted completed task cards for the selected day
- App-day aggregation for older completion timestamps
- Daily Review results for the selected day

The week view summarizes completed tasks from Sunday through Saturday, matching the weekly task-completion card on Today. Active tasks created after the selected week are not backfilled into old weeks as zero-count rows, while tasks that existed during that week or were completed during that week remain visible.

Weekly Review lives in the History week view. When the previous week has not been completed yet, Today shows a Weekly Review prompt directly after Daily Review. Pressing Start Weekly Review opens a short modal that explains the review and sends the user to the correct History week page. The review asks questions such as what moved forward, what felt busy but not useful, what to do more or less of next week, whether tasks should change, and whether the current routine matches the user's goals.

History uses the same Eastern-time app-day logic as Today, so task completions are grouped by the day the app considers active rather than by the server's raw UTC date.

## Daily Review Checks

Daily Review checks are for outcomes that can only be answered honestly after the day is over. They are different from tasks because the user does not start or complete them during the day.

Examples:

```text
Was below calorie limit?
Hit protein target?
No late-night snacking?
No unnecessary spending?
Got 7+ hours of sleep?
```

On the next app day, UpNext can prompt the user to review yesterday with Yes, No, Skip, or Not sure. Results are stored against the reviewed day, so answering on June 20 records the result for June 19.

Daily checks can be created, edited, or removed from the Tasks page. The review prompt appears on Today, results appear in History, and aggregate success rates appear on the Dashboard.

## Action Items and Commitments

Recurring improvement work belongs in the daily task stack. One-off async work belongs in Action Items. Time-based obligations belong in Commitments.

Action Items are for tasks that need to happen once but do not require a specific time, such as:

```text
Return package
Call pharmacy
Submit reimbursement form
```

They can include an optional due date, description, and playbook. Open action items appear on Today even when their due date is in the future, making it possible to finish them early instead of waiting until the deadline. Completed and canceled action items stay out of the Today action stack.

Commitments are for scheduled or date-based obligations, such as:

```text
Dentist appointment
Work function
Interview
Grocery pickup
Go to church every Sunday at 11 AM
```

They can include a date, optional start and end time, location, description, and playbook. Commitments can also repeat weekly on one or more selected days. For example, a recurring `Go to church` commitment can appear in Today every Sunday, while a `Team standup` can repeat Monday-Friday and an `Evening shutdown` can repeat every day until the series is changed or canceled.

Recurring commitment completions are stored per occurrence, so completing this Sunday's event does not complete the whole series.

## Calendar

The Calendar page gives a month-level view of dated items. It includes:

- One-time commitments on their scheduled day
- Weekly recurring commitment occurrences generated for each matching weekday in the selected month
- Action items with due dates
- Active announcements with future event dates

The page has Previous, This Month, and Next controls for moving between months. Each day shows its dated items directly on the calendar grid, and a Month Agenda below the grid lists the same items in chronological order for easier scanning.

## Topics

Topics are reusable notes that do not belong to one specific task. They can hold general playbooks, reminders, current projects, principles, or reference notes.

Examples:

```text
Networking events
Interview mindset
Current projects
Nutrition rules
Sunday reset
```

Topics can be categorized, edited, archived, and restored. The Topics index stays compact with clickable rows, while each topic opens into a full-page editor with a large notes surface for longer reusable playbooks or reference material.

Topic pages also support image montages. Images can be selected from disk or pasted directly into the uploader, then saved with captions and alt text. Prisma stores image metadata and ownership, while Vercel Blob stores the image files. Deleting a topic removes its saved image metadata through cascading database relations.

Topics are separate from task playbooks today, but they are designed so future task-topic badges can connect reusable topic notes to specific tasks.

## Tools

The Tools section includes lightweight timers and utilities that do not need to be tied to recurring tasks:

- A persistent scratch counter stored locally in the browser until Reset is pressed.
- A flexible timer that can start, pause, continue, reset, manually add or remove time, save entries for the day, and show Sunday-through-Saturday weekly totals.
- A Pomodoro timer with adjustable work length, 5-10 minute break options, and an alarm when an interval ends.

## Nutrition and Fasting

The Nutrition page tracks calorie intake, daily weigh-ins, and fasting sessions.

Calories can be logged throughout the day with an optional note. If a user goes past midnight or wants to plan ahead, calories can also be logged one app day ahead.

Daily weight is stored as one weigh-in per app day. The recent-day history shows calories, weight, and the day-to-day weight fluctuation when both the current day and previous day have saved weights. The Weight Comparison card lets the user choose a past weigh-in and compare it against today's saved weight. Users can also set a starting weight baseline to compare current progress against the original starting point.

The fasting timer can be started and stopped from the Nutrition page. If the user forgets to start the timer, the start form supports choosing an earlier date and time, such as starting a fast from 2 PM even if the timer is started at 4 PM. Recent completed fasts show their start time, end time, and duration.

## Downtime Tracking

The Time page tracks time spent away from improvement activities. A user can switch the active time-away timer between:

- Sleep
- Social
- Eating
- Other

The timer keeps running if the user navigates away. When a task timer starts, active downtime stops. When task time stops, Other time starts again by default. If an active timer crosses the app-day boundary, UpNext closes the previous day's session at Eastern midnight and starts a new session for the new day.

This data is intended for future analytics around available free time, routines, and opportunities to adjust how time is spent.

## Announcements

Announcements let a signed-in user set a future event banner for the app. The banner appears globally, shows the event title, and includes a countdown to the event time. The countdown hydrates from the same server-rendered value and then updates in the browser, avoiding server/client time drift during initial render.

## Password Reset

The login page includes a Forgot password flow for email/password accounts. Reset requests always show the same success message whether or not the email exists, so the app does not reveal registered addresses.

Reset links use random single-use tokens. The raw token is sent only in the reset link, while the database stores a SHA-256 token hash, expiration time, and used timestamp. Links expire after 60 minutes. After a successful reset, the token is marked used and the user is sent back to login.

Production email sending uses Resend when `RESEND_API_KEY` and `PASSWORD_RESET_EMAIL_FROM` are configured. Resend has a free tier suitable for low-volume transactional email. In local development, if those env vars are missing, the reset link is logged to the dev server console instead of sending email.

## Analytics Dashboard

The Dashboard page summarizes recent app activity across the last 14 app days. It includes:

- Task completion rate
- Daily completion trend
- Current Sunday-through-Saturday task completion totals, including active tasks with zero completions
- Focused task time by task
- Completion breakdown by task area or group
- Downtime logged by day and category
- Scheduled commitment load
- Action item open, overdue, completed, and canceled counts
- Daily Review success rate and per-check outcome totals
- Playbook coverage across tasks, action items, and commitments
- Most completed tasks

The dashboard uses existing database records rather than separate analytics tables, so it updates as tasks are completed, downtime sessions are logged, action items are resolved, and commitments are created or completed. Deleted Daily Review checks are excluded from review graphs so old inactive prompts do not continue appearing in dashboard analytics.

## Tech Stack

- Next.js 15 App Router
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

- `User` stores account data and optional starting-weight baseline settings.
- `PasswordResetToken` stores hashed, expiring, single-use password reset tokens.
- `TaskGroup` stores related task groups.
- `Task` stores recurring tasks, mandatory status, group membership, stack order, and optional playbook notes.
- `TaskCompletion` stores per-day task completion history.
- `TaskSkip` stores per-day skipped tasks without counting them as completions.
- `TaskSession` stores focused task timer sessions for task-time analytics.
- `TaskSubtask` stores active subtasks for recurring tasks.
- `SubtaskCompletion` stores per-day subtask completion history.
- `DowntimeSession` stores timed sleep, social, eating, and other sessions.
- `CalorieEntry` stores calorie logs for today or one app day ahead.
- `WeightEntry` stores one daily weigh-in per user and app day.
- `FastingSession` stores fasting timer start and end timestamps.
- `ActionItem` stores one-off async tasks with optional due dates, completion status, cancellation status, and playbook notes.
- `Topic` stores reusable notes, reminders, current focus areas, and general playbooks.
- `TopicImage` stores topic image metadata, ownership, captions, alt text, and Blob pathnames.
- `Commitment` stores date-based, time-based, and weekly recurring obligations with optional location, start/end times, completion status, cancellation status, and playbook notes.
- `CommitmentOccurrenceCompletion` stores per-day completions for recurring commitment instances.
- `DailyCheck` stores active next-day outcome prompts for a user.
- `Challenge` stores fixed-duration streak-style Daily Review goals.
- `DailyCheckResult` stores Yes, No, Skip, or Not sure answers against the reviewed app day.
- `DailyReviewDismissal` stores when a user dismisses a day's review prompt.
- `WeeklyReview` stores Sunday-through-Saturday reflection answers and completion status.
- `DayStartOverride` stores a temporary per-user effective-day override for starting tomorrow early.
- `Announcement` stores active future event banners and countdown target times.

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
BLOB_READ_WRITE_TOKEN="vercel-blob-token-for-topic-images"
RESEND_API_KEY="resend-api-key-for-password-reset-email"
PASSWORD_RESET_EMAIL_FROM="UpNext <reset@example.com>"
```

Apply database migrations:

```bash
npx prisma migrate dev
```

Start the development server:

```bash
npm run dev
```

If the local Next dev cache gets into a bad state, start from a clean cache:

```bash
npm run dev:clean
```

For a production-like local run that avoids the dev cache path entirely:

```bash
npm run preview
```

Open:

```text
http://localhost:3000
```

## Demo Data

For local screenshots, demos, and manual QA, seed a demo account:

```bash
npm run seed:demo
```

Then log in with:

```text
Email: demo@upnext.dev
Password: demo-password
```

The demo seed deletes and recreates only `demo@upnext.dev`. It does not touch other users. The script refuses to run with `NODE_ENV=production` unless `ALLOW_DEMO_SEED_PRODUCTION=true` is explicitly set.

The seed includes realistic coverage for screenshots and QA:

- 12 recurring tasks across Health, Career, Life Admin, and Social groups
- Mandatory tasks, rotating grouped tasks, task playbooks, and subtasks
- 21 days of task completions, task sessions, subtask completions, and downtime sessions
- Action items with open, overdue, completed, and canceled states
- One-time, single-day weekly, weekday, and every-day recurring commitments with occurrence completions
- Daily Review checks and historical Yes/No/Skip/Unsure results
- Long-form Topics for the full-page topic editor

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
- Built-app smoke check

## Roadmap

- Monthly summaries
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

### Editable Playbook Modal

![Editable Playbook Modal](public/readme/playbook-modal.png)

### Action Items

![Action Items](public/readme/actions.png)

### Commitments

![Schedule and Commitments](public/readme/commitments.png)

### Time Away Tracking

![Time Away Tracking](public/readme/time.png)

### Completion History

![Completion History](public/readme/history.png)

### Topics

![Topics](public/readme/topics.png)

### Full-Page Topic Editor

![Full-Page Topic Editor](public/readme/topic-detail.png)

### Persistent Counter Tool

![Persistent Counter Tool](public/readme/counter.png)
