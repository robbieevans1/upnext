import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USER_ID = "demo-user";
const DEMO_EMAIL = "demo@upnext.dev";
const DEMO_PASSWORD = "demo-password";
const APP_TIME_ZONE = "America/New_York";

function getDateParts(date, timeZone = APP_TIME_ZONE) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const parts = formatter.formatToParts(date);

	return {
		year: Number(parts.find((part) => part.type === "year")?.value),
		month: Number(parts.find((part) => part.type === "month")?.value),
		day: Number(parts.find((part) => part.type === "day")?.value),
	};
}

function getDateTimeParts(date, timeZone = APP_TIME_ZONE) {
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	const parts = formatter.formatToParts(date);
	const value = (type) =>
		Number(parts.find((part) => part.type === type)?.value);

	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
		hour: value("hour"),
		minute: value("minute"),
		second: value("second"),
	};
}

function getTimeZoneOffsetMs(date, timeZone = APP_TIME_ZONE) {
	const parts = getDateTimeParts(date, timeZone);
	const timeZoneTimeAsUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
	);

	return timeZoneTimeAsUtc - date.getTime();
}

function getUtcInstantForTimeZoneDate(
	parts,
	hour = 0,
	minute = 0,
	second = 0,
	timeZone = APP_TIME_ZONE,
) {
	const utcGuess = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		hour,
		minute,
		second,
	);
	const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
	const firstInstant = utcGuess - firstOffset;
	const correctedOffset = getTimeZoneOffsetMs(new Date(firstInstant), timeZone);

	return new Date(utcGuess - correctedOffset);
}

function getAppTodayDate(date = new Date()) {
	return getUtcInstantForTimeZoneDate(getDateParts(date));
}

function getAppDayOfWeek(date) {
	const parts = getDateParts(date);

	return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function addAppDays(date, days) {
	const parts = getDateParts(date);

	return getUtcInstantForTimeZoneDate({
		year: parts.year,
		month: parts.month,
		day: parts.day + days,
	});
}

function atAppTime(day, hour, minute = 0) {
	const parts = getDateParts(day);

	return getUtcInstantForTimeZoneDate(parts, hour, minute);
}

function addMinutes(date, minutes) {
	return new Date(date.getTime() + minutes * 60 * 1000);
}

function requireSafeEnvironment() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set.");
	}

	if (
		process.env.NODE_ENV === "production" &&
		process.env.ALLOW_DEMO_SEED_PRODUCTION !== "true"
	) {
		throw new Error(
			"Refusing to seed demo data in production. Set ALLOW_DEMO_SEED_PRODUCTION=true if you really intend to do this.",
		);
	}
}

async function resetDemoUser() {
	await prisma.user.deleteMany({
		where: {
			email: DEMO_EMAIL,
		},
	});

	return prisma.user.create({
		data: {
			id: DEMO_USER_ID,
			name: "Demo User",
			email: DEMO_EMAIL,
			emailVerified: new Date(),
			passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
		},
	});
}

async function createGroups() {
	const groups = [
		{
			id: "demo-group-health",
			name: "Health",
			description: "Fitness, nutrition, and recovery habits.",
		},
		{
			id: "demo-group-career",
			name: "Career",
			description: "Projects, interview prep, and professional growth.",
		},
		{
			id: "demo-group-life",
			name: "Life Admin",
			description: "Errands, cleaning, money, and maintenance.",
		},
		{
			id: "demo-group-social",
			name: "Social",
			description: "Relationships, confidence practice, and events.",
		},
	];

	await prisma.taskGroup.createMany({
		data: groups.map((group) => ({
			...group,
			userId: DEMO_USER_ID,
		})),
	});

	return new Map(groups.map((group) => [group.name, group.id]));
}

async function createTasks(groupIds) {
	const tasks = [
		{
			id: "demo-task-workout",
			title: "Workout",
			description: "Train for at least 45 minutes.",
			playbook:
				"Put phone away. Start with warmup. Focus on form before weight. Leave when the planned work is done.",
			isMandatory: true,
			groupId: groupIds.get("Health"),
			stackOrder: 0,
			subtasks: ["Warm up", "Main lift", "Conditioning", "Stretch"],
		},
		{
			id: "demo-task-calories",
			title: "Plan meals",
			description: "Set up meals so staying near the calorie target is easier.",
			playbook:
				"Decide protein first. Keep snacks visible only if they fit the day. Avoid making food decisions while hungry.",
			isMandatory: true,
			groupId: groupIds.get("Health"),
			stackOrder: 1,
			subtasks: ["Log breakfast", "Plan dinner", "Prep protein"],
		},
		{
			id: "demo-task-read",
			title: "Read",
			description: "Read at least 30 minutes.",
			playbook:
				"Choose the book before sitting down. Phone stays across the room. Continue if momentum is good.",
			isMandatory: false,
			groupId: null,
			stackOrder: 0,
			subtasks: ["Pick book", "Read 30 minutes", "Write one takeaway"],
		},
		{
			id: "demo-task-portfolio",
			title: "Portfolio project",
			description: "Ship one small improvement.",
			playbook:
				"Define the smallest visible improvement. Open the repo first. Commit before switching context.",
			isMandatory: false,
			groupId: groupIds.get("Career"),
			stackOrder: 0,
			subtasks: ["Pick issue", "Implement slice", "Run tests", "Write notes"],
		},
		{
			id: "demo-task-leetcode",
			title: "Practice one coding problem",
			description: "Solve or deeply review one interview problem.",
			playbook:
				"State brute force first. Write constraints. After solving, explain the complexity out loud.",
			isMandatory: false,
			groupId: groupIds.get("Career"),
			stackOrder: 1,
			subtasks: ["Read prompt", "Attempt solution", "Review complexity"],
		},
		{
			id: "demo-task-clean-kitchen",
			title: "Reset kitchen",
			description: "Clear dishes and counters before the day ends.",
			playbook:
				"Start with trash, then dishes, then counters. Keep the timer short and stop when the room is functional.",
			isMandatory: false,
			groupId: groupIds.get("Life Admin"),
			stackOrder: 0,
			subtasks: ["Dishes", "Counters", "Trash"],
		},
		{
			id: "demo-task-budget",
			title: "Review spending",
			description: "Check recent charges and update the budget.",
			playbook:
				"Look for subscriptions, food delivery, and impulse purchases. Decide one change for tomorrow.",
			isMandatory: false,
			groupId: groupIds.get("Life Admin"),
			stackOrder: 1,
			subtasks: ["Check cards", "Categorize spending", "Pick adjustment"],
		},
		{
			id: "demo-task-reach-out",
			title: "Reach out to someone",
			description: "Send one thoughtful message or make one plan.",
			playbook:
				"Keep it simple. Ask a specific question. Suggest a concrete time if making plans.",
			isMandatory: false,
			groupId: groupIds.get("Social"),
			stackOrder: 0,
			subtasks: ["Pick person", "Send message", "Follow up if needed"],
		},
		{
			id: "demo-task-job-application",
			title: "Apply to one role",
			description: "Submit one thoughtful application or improve one draft.",
			playbook:
				"Read the posting once for fit, then tailor the top third of the resume. Write a short note that proves you understand the role. Stop after one high-quality application.",
			isMandatory: false,
			groupId: groupIds.get("Career"),
			stackOrder: 2,
			subtasks: ["Pick role", "Tailor resume", "Submit application"],
		},
		{
			id: "demo-task-morning-light",
			title: "Morning light walk",
			description: "Get outside early and set the rhythm for the day.",
			playbook:
				"Shoes on before checking messages. Walk without headphones for the first five minutes. Notice energy and mood when returning.",
			isMandatory: false,
			groupId: groupIds.get("Health"),
			stackOrder: 2,
			subtasks: ["Shoes on", "Walk 15 minutes", "Drink water"],
		},
		{
			id: "demo-task-laundry",
			title: "Laundry reset",
			description: "Move clothes through one complete wash/dry/fold cycle.",
			playbook:
				"Start the washer before another task. Set a timer. Fold immediately so the task is actually done, not just moved.",
			isMandatory: false,
			groupId: groupIds.get("Life Admin"),
			stackOrder: 2,
			subtasks: ["Start load", "Move to dryer", "Fold and put away"],
		},
		{
			id: "demo-task-date-prep",
			title: "Date night prep",
			description: "Prepare to show up calm, present, and confident.",
			playbook:
				"Pick clothes early. Confirm the plan. Arrive unrushed. Ask real questions and keep the phone away.",
			isMandatory: false,
			groupId: groupIds.get("Social"),
			stackOrder: 1,
			subtasks: ["Confirm plan", "Choose outfit", "Review conversation notes"],
		},
	];

	for (const task of tasks) {
		await prisma.task.create({
			data: {
				id: task.id,
				title: task.title,
				description: task.description,
				playbook: task.playbook,
				isMandatory: task.isMandatory,
				groupId: task.groupId,
				stackOrder: task.stackOrder,
				userId: DEMO_USER_ID,
				subtasks: {
					create: task.subtasks.map((title, index) => ({
						id: `${task.id}-subtask-${index + 1}`,
						title,
						stackOrder: index,
						userId: DEMO_USER_ID,
					})),
				},
			},
		});
	}

	return tasks;
}

async function createTaskHistory(tasks, today) {
	const completions = [];
	const sessions = [];
	const subtaskCompletions = [];

	for (let offset = 20; offset >= 0; offset -= 1) {
		const day = addAppDays(today, -offset);

		for (const [taskIndex, task] of tasks.entries()) {
			const didComplete =
				task.isMandatory ||
				(offset + taskIndex) % 3 === 0 ||
				(task.id === "demo-task-read" && offset % 2 === 0) ||
				(task.id === "demo-task-portfolio" && offset % 4 !== 1);

			if (!didComplete) {
				continue;
			}

			completions.push({
				taskId: task.id,
				userId: DEMO_USER_ID,
				completedOn: day,
				createdAt: atAppTime(day, 20, 15),
			});

			const startHour = 7 + ((taskIndex * 2 + offset) % 10);
			const duration = task.isMandatory ? 45 + (offset % 3) * 10 : 25 + (taskIndex % 4) * 15;
			const startedAt = atAppTime(day, startHour, (taskIndex * 7) % 45);

			sessions.push({
				taskId: task.id,
				userId: DEMO_USER_ID,
				day,
				startedAt,
				stoppedAt: addMinutes(startedAt, duration),
			});

			if (task.id === "demo-task-read" && offset % 4 === 0) {
				const continueStart = atAppTime(day, 21, 0);
				sessions.push({
					taskId: task.id,
					userId: DEMO_USER_ID,
					day,
					startedAt: continueStart,
					stoppedAt: addMinutes(continueStart, 30),
				});
			}

			const completedSubtasks = Math.max(
				1,
				Math.min(task.subtasks.length, task.subtasks.length - (offset % 2)),
			);

			for (let subtaskIndex = 0; subtaskIndex < completedSubtasks; subtaskIndex += 1) {
				subtaskCompletions.push({
					subtaskId: `${task.id}-subtask-${subtaskIndex + 1}`,
					taskId: task.id,
					userId: DEMO_USER_ID,
					completedOn: day,
					createdAt: atAppTime(day, 18, subtaskIndex * 5),
				});
			}
		}
	}

	await prisma.taskCompletion.createMany({
		data: completions,
		skipDuplicates: true,
	});
	await prisma.taskSession.createMany({
		data: sessions,
	});
	await prisma.subtaskCompletion.createMany({
		data: subtaskCompletions,
		skipDuplicates: true,
	});

	return {
		completions: completions.length,
		sessions: sessions.length,
		subtaskCompletions: subtaskCompletions.length,
	};
}

async function createDowntime(today) {
	const sessions = [];

	for (let offset = 20; offset >= 0; offset -= 1) {
		const day = addAppDays(today, -offset);
		const sleepStart = atAppTime(day, 0, 15);
		const eatingStart = atAppTime(day, 12, 10);
		const socialStart = atAppTime(day, 18, 30);
		const otherStart = atAppTime(day, 22, 0);

		sessions.push(
			{
				userId: DEMO_USER_ID,
				category: "Sleep",
				day,
				startedAt: sleepStart,
				stoppedAt: addMinutes(sleepStart, 420 + (offset % 4) * 15),
			},
			{
				userId: DEMO_USER_ID,
				category: "Eating",
				day,
				startedAt: eatingStart,
				stoppedAt: addMinutes(eatingStart, 55 + (offset % 3) * 10),
			},
			{
				userId: DEMO_USER_ID,
				category: "Social",
				day,
				startedAt: socialStart,
				stoppedAt: addMinutes(socialStart, offset % 2 === 0 ? 90 : 45),
			},
			{
				userId: DEMO_USER_ID,
				category: "Other",
				day,
				startedAt: otherStart,
				stoppedAt: addMinutes(otherStart, 75 + (offset % 5) * 12),
			},
		);
	}

	await prisma.downtimeSession.createMany({
		data: sessions,
	});

	return sessions.length;
}

async function createActionItems(today) {
	const actionItems = [
		{
			title: "Schedule annual physical",
			description: "Call the doctor and find an appointment time.",
			playbook: "Call before lunch. Have insurance card ready.",
			dueOn: addAppDays(today, -2),
			completedAt: null,
			canceledAt: null,
		},
		{
			title: "Buy protein powder",
			description: "Restock before the weekend.",
			playbook: "Check price per serving. Do not buy extras.",
			dueOn: today,
			completedAt: null,
			canceledAt: null,
		},
		{
			title: "Send rent confirmation",
			description: "Email receipt to roommate.",
			playbook: "Attach screenshot and keep message short.",
			dueOn: addAppDays(today, -4),
			completedAt: atAppTime(addAppDays(today, -3), 9, 30),
			canceledAt: null,
		},
		{
			title: "Return old charger",
			description: "No longer needed.",
			playbook: null,
			dueOn: addAppDays(today, -1),
			completedAt: null,
			canceledAt: atAppTime(addAppDays(today, -1), 16, 0),
		},
		{
			title: "Order replacement running shoes",
			description: "Current pair is worn out.",
			playbook: "Buy the same model unless there is a clear reason to switch.",
			dueOn: addAppDays(today, 2),
			completedAt: null,
			canceledAt: null,
		},
		{
			title: "Update resume bullet",
			description: "Rewrite one project bullet with a clearer impact statement.",
			playbook:
				"Start with the outcome. Include the constraint. End with a measurable result or user-facing improvement.",
			dueOn: today,
			completedAt: null,
			canceledAt: null,
		},
		{
			title: "Text Alex about Saturday",
			description: "Confirm the plan while it is still easy to coordinate.",
			playbook:
				"Suggest one concrete time and place. Keep the message warm and simple.",
			dueOn: addAppDays(today, 1),
			completedAt: null,
			canceledAt: null,
		},
		{
			title: "Cancel unused trial",
			description: "Avoid getting charged next week.",
			playbook: "Search email for the receipt, cancel, and save confirmation.",
			dueOn: addAppDays(today, -1),
			completedAt: atAppTime(today, 8, 40),
			canceledAt: null,
		},
		{
			title: "Drop package at UPS",
			description: "Return the shirt before the window closes.",
			playbook: "Put the package by the door and go before lunch.",
			dueOn: addAppDays(today, -3),
			completedAt: null,
			canceledAt: null,
		},
	];

	await prisma.actionItem.createMany({
		data: actionItems.map((item) => ({
			...item,
			userId: DEMO_USER_ID,
		})),
	});

	return actionItems.length;
}

async function createCommitments(today) {
	const todayDayOfWeek = getAppDayOfWeek(today);
	const commitments = [
		{
			id: "demo-commitment-standup",
			title: "Team standup",
			description: "Share progress and blockers.",
			playbook: "Be concise. Mention one concrete next step.",
			location: "Zoom",
			day: today,
			startsAt: atAppTime(today, 9, 30),
			endsAt: atAppTime(today, 9, 50),
			completedAt: null,
			canceledAt: null,
			recurrence: "NONE",
			recurrenceDayOfWeek: null,
		},
		{
			id: "demo-commitment-work-function",
			title: "Work function",
			description: "Department networking event.",
			playbook:
				"Stand up straight, smile, ask questions, and leave after two strong conversations.",
			location: "Downtown",
			day: today,
			startsAt: atAppTime(today, 18, 0),
			endsAt: atAppTime(today, 20, 0),
			completedAt: null,
			canceledAt: null,
			recurrence: "NONE",
			recurrenceDayOfWeek: null,
		},
		{
			id: "demo-commitment-weekly-planning",
			title: "Weekly planning review",
			description: "Review the week and choose the next priorities.",
			playbook:
				"Open the dashboard first. Pick one adjustment for time, one for tasks, and one for social plans.",
			location: "Home",
			day: addAppDays(today, -7),
			startsAt: atAppTime(addAppDays(today, -7), 10, 0),
			endsAt: atAppTime(addAppDays(today, -7), 10, 45),
			completedAt: null,
			canceledAt: null,
			recurrence: "WEEKLY",
			recurrenceDayOfWeek: todayDayOfWeek,
		},
		{
			id: "demo-commitment-church",
			title: "Go to church",
			description: "Weekly service.",
			playbook: "Arrive a few minutes early. Put phone away. Say hello after.",
			location: "Church",
			day: addAppDays(today, -todayDayOfWeek),
			startsAt: atAppTime(addAppDays(today, -todayDayOfWeek), 11, 0),
			endsAt: atAppTime(addAppDays(today, -todayDayOfWeek), 12, 15),
			completedAt: null,
			canceledAt: null,
			recurrence: "WEEKLY",
			recurrenceDayOfWeek: 0,
		},
		{
			id: "demo-commitment-grocery",
			title: "Grocery pickup",
			description: "Pick up meal prep groceries.",
			playbook: "Stick to the list. Avoid adding snacks in the store.",
			location: "Market",
			day: addAppDays(today, 1),
			startsAt: atAppTime(addAppDays(today, 1), 17, 30),
			endsAt: atAppTime(addAppDays(today, 1), 18, 0),
			completedAt: null,
			canceledAt: null,
			recurrence: "NONE",
			recurrenceDayOfWeek: null,
		},
		{
			id: "demo-commitment-coffee",
			title: "Coffee with Sam",
			description: "Catch up and practice being present.",
			playbook: "Phone away. Ask about their new job. Listen more than talk.",
			location: "Cafe",
			day: addAppDays(today, -2),
			startsAt: atAppTime(addAppDays(today, -2), 16, 0),
			endsAt: atAppTime(addAppDays(today, -2), 17, 0),
			completedAt: atAppTime(addAppDays(today, -2), 17, 5),
			canceledAt: null,
			recurrence: "NONE",
			recurrenceDayOfWeek: null,
		},
		{
			id: "demo-commitment-dentist",
			title: "Dentist appointment",
			description: "Routine cleaning.",
			playbook: null,
			location: "Dental office",
			day: addAppDays(today, -5),
			startsAt: atAppTime(addAppDays(today, -5), 8, 0),
			endsAt: atAppTime(addAppDays(today, -5), 8, 45),
			completedAt: null,
			canceledAt: atAppTime(addAppDays(today, -6), 14, 0),
			recurrence: "NONE",
			recurrenceDayOfWeek: null,
		},
		{
			id: "demo-commitment-interview",
			title: "Mock interview",
			description: "Practice behavioral and technical storytelling.",
			playbook:
				"Open with the situation, name the constraint, explain the action, and close with what changed.",
			location: "Video call",
			day: today,
			startsAt: atAppTime(today, 15, 0),
			endsAt: atAppTime(today, 16, 0),
			completedAt: null,
			canceledAt: null,
			recurrence: "NONE",
			recurrenceDayOfWeek: null,
		},
		{
			id: "demo-commitment-family-call",
			title: "Family call",
			description: "Weekly check-in with parents.",
			playbook:
				"Call while walking. Ask about their week before talking about yours.",
			location: "Phone",
			day: addAppDays(today, -3),
			startsAt: atAppTime(addAppDays(today, -3), 19, 0),
			endsAt: atAppTime(addAppDays(today, -3), 19, 45),
			completedAt: null,
			canceledAt: null,
			recurrence: "WEEKLY",
			recurrenceDayOfWeek: getAppDayOfWeek(addAppDays(today, -3)),
		},
	];

	await prisma.commitment.createMany({
		data: commitments.map((commitment) => ({
			...commitment,
			userId: DEMO_USER_ID,
		})),
	});

	await prisma.commitmentOccurrenceCompletion.createMany({
		data: [
			{
				commitmentId: "demo-commitment-weekly-planning",
				userId: DEMO_USER_ID,
				occurrenceDay: addAppDays(today, -14),
				completedAt: atAppTime(addAppDays(today, -14), 10, 50),
			},
			{
				commitmentId: "demo-commitment-weekly-planning",
				userId: DEMO_USER_ID,
				occurrenceDay: addAppDays(today, -7),
				completedAt: atAppTime(addAppDays(today, -7), 10, 45),
			},
			{
				commitmentId: "demo-commitment-family-call",
				userId: DEMO_USER_ID,
				occurrenceDay: addAppDays(today, -3),
				completedAt: atAppTime(addAppDays(today, -3), 19, 50),
			},
			{
				commitmentId: "demo-commitment-family-call",
				userId: DEMO_USER_ID,
				occurrenceDay: addAppDays(today, -10),
				completedAt: atAppTime(addAppDays(today, -10), 19, 40),
			},
		],
		skipDuplicates: true,
	});

	return commitments.length;
}

async function createDailyChecks(today) {
	const checks = [
		{
			id: "demo-daily-check-calories",
			title: "Was below calorie limit?",
			description: "Answer based on yesterday's full day of eating.",
		},
		{
			id: "demo-daily-check-protein",
			title: "Hit protein target?",
			description: "Count the day as a yes if meals supported recovery.",
		},
		{
			id: "demo-daily-check-late-snack",
			title: "Avoided late-night snacking?",
			description: "Use this to spot evening routine patterns.",
		},
		{
			id: "demo-daily-check-sleep",
			title: "Got 7+ hours of sleep?",
			description: "Answer yes when sleep was long enough to recover.",
		},
		{
			id: "demo-daily-check-spending",
			title: "Avoided unnecessary spending?",
			description: "A quick check for impulse purchases and delivery.",
		},
		{
			id: "demo-daily-check-screen-time",
			title: "Stayed under screen time limit?",
			description: "Use the phone report or an honest estimate.",
		},
		{
			id: "demo-daily-check-bedtime",
			title: "Went to bed before midnight?",
			description: "Track whether the evening routine protected tomorrow.",
		},
	];
	const results = [];

	await prisma.dailyCheck.createMany({
		data: checks.map((check, index) => ({
			...check,
			userId: DEMO_USER_ID,
			sortOrder: index,
		})),
	});

	for (let offset = 20; offset >= 1; offset -= 1) {
		const day = addAppDays(today, -offset);

		for (const [index, check] of checks.entries()) {
			const selector = (offset + index) % 9;
			const status =
				selector === 0
					? "UNSURE"
					: selector === 1
						? "SKIP"
						: selector <= 3
							? "NO"
							: "YES";

			results.push({
				dailyCheckId: check.id,
				userId: DEMO_USER_ID,
				targetDay: day,
				status,
				createdAt: atAppTime(addAppDays(day, 1), 8, 15 + index),
				updatedAt: atAppTime(addAppDays(day, 1), 8, 15 + index),
			});
		}
	}

	await prisma.dailyCheckResult.createMany({
		data: results,
		skipDuplicates: true,
	});

	return {
		checks: checks.length,
		results: results.length,
	};
}

async function createTopics() {
	const topics = [
		{
			title: "Networking events",
			category: "Social",
			description: "A general playbook for work functions and meetups.",
			body:
				"Before entering:\n- Stand up straight and breathe slowly.\n- Put the phone away before walking into the room.\n- Pick one simple opener: How do you know the host? or What are you working on lately?\n\nDuring conversations:\n- Smile before speaking.\n- Ask one follow-up before telling your own story.\n- Keep answers concise and positive.\n- Leave after two strong conversations instead of waiting until energy crashes.\n\nAfterward:\n- Write down one person to follow up with.\n- Send the message within 24 hours.",
			isArchived: false,
		},
		{
			title: "Interview mindset",
			category: "Career",
			description: "Reminders to reread before interviews.",
			body:
				"Core posture:\n- Pause before answering.\n- Use specific examples.\n- Explain tradeoffs instead of pretending every choice was obvious.\n- Say what you learned.\n\nBehavioral answers:\nUse Situation, Task, Action, Result, Reflection. The reflection is where maturity shows.\n\nTechnical answers:\nState the simplest solution first, then improve it. Name constraints and edge cases. If stuck, narrate the next useful question.\n\nQuestions to ask:\n- What would success look like in the first 90 days?\n- What problems is the team most excited to solve this year?\n- Where do people usually struggle in this role?",
			isArchived: false,
		},
		{
			title: "Current projects",
			category: "Focus",
			description: "A snapshot of active work areas.",
			body:
				"UpNext:\n- Polish Today mobile cards.\n- Expand dashboard analytics.\n- Connect reusable topics to tasks later.\n\nCareer:\n- Portfolio project improvements.\n- Mock interview reps.\n- Resume bullet cleanup.\n\nHealth:\n- Consistent workouts.\n- Protein target.\n- More stable evening routine.\n\nSocial:\n- Make one plan per week.\n- Practice showing up calm and present.",
			isArchived: false,
		},
		{
			title: "Nutrition rules",
			category: "Health",
			description: "Simple rules that make food decisions easier.",
			body:
				"Default rules:\n- Protein first.\n- Plan dinner before 3 PM.\n- Keep easy snacks out of sight.\n- Do not make food decisions while hungry.\n- If eating out, decide the order before arriving.\n\nRecovery:\n- Water after workouts.\n- Do not punish a bad meal with skipped meals.\n- Look for weekly patterns, not one noisy day.",
			isArchived: false,
		},
		{
			title: "First date reminders",
			category: "Social",
			description: "A reusable note for being relaxed and present on dates.",
			body:
				"Before:\n- Pick clothes early.\n- Confirm the plan.\n- Arrive unrushed.\n\nDuring:\n- Ask about stories, not just facts.\n- Keep the phone out of sight.\n- Share enough to be known, then ask a follow-up.\n- Notice whether the conversation feels mutual.\n\nAfter:\n- If it went well, send a clear message instead of being vague.",
			isArchived: false,
		},
		{
			title: "Sunday reset",
			category: "Life Admin",
			description: "A repeatable reset routine for the apartment and week.",
			body:
				"1. Trash and dishes.\n2. Laundry started.\n3. Groceries or meal plan.\n4. Calendar scan.\n5. Pick three outcomes for the week.\n6. Set clothes and bag for Monday.\n\nThe goal is not a perfect apartment. The goal is a lower-friction Monday.",
			isArchived: false,
		},
		{
			title: "Old focus area",
			category: "Archive",
			description: "An example archived topic.",
			body: "This topic is kept for reference but hidden from active focus.",
			isArchived: true,
		},
	];

	await prisma.topic.createMany({
		data: topics.map((topic) => ({
			...topic,
			userId: DEMO_USER_ID,
		})),
	});

	return topics.length;
}

async function main() {
	requireSafeEnvironment();

	const today = getAppTodayDate();
	await resetDemoUser();
	const groupIds = await createGroups();
	const tasks = await createTasks(groupIds);
	const taskHistory = await createTaskHistory(tasks, today);
	const downtimeSessions = await createDowntime(today);
	const actionItems = await createActionItems(today);
	const commitments = await createCommitments(today);
	const dailyReview = await createDailyChecks(today);
	const topics = await createTopics();

	console.log("Seeded demo data.");
	console.log(`Email: ${DEMO_EMAIL}`);
	console.log(`Password: ${DEMO_PASSWORD}`);
	console.log(`Tasks: ${tasks.length}`);
	console.log(`Task completions: ${taskHistory.completions}`);
	console.log(`Task sessions: ${taskHistory.sessions}`);
	console.log(`Subtask completions: ${taskHistory.subtaskCompletions}`);
	console.log(`Downtime sessions: ${downtimeSessions}`);
	console.log(`Action items: ${actionItems}`);
	console.log(`Commitments: ${commitments}`);
	console.log(`Topics: ${topics}`);
	console.log(`Daily checks: ${dailyReview.checks}`);
	console.log(`Daily check results: ${dailyReview.results}`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
