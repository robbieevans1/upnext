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
	const commitments = [
		{
			title: "Team standup",
			description: "Share progress and blockers.",
			playbook: "Be concise. Mention one concrete next step.",
			location: "Zoom",
			day: today,
			startsAt: atAppTime(today, 9, 30),
			endsAt: atAppTime(today, 9, 50),
			completedAt: null,
			canceledAt: null,
		},
		{
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
		},
		{
			title: "Grocery pickup",
			description: "Pick up meal prep groceries.",
			playbook: "Stick to the list. Avoid adding snacks in the store.",
			location: "Market",
			day: addAppDays(today, 1),
			startsAt: atAppTime(addAppDays(today, 1), 17, 30),
			endsAt: atAppTime(addAppDays(today, 1), 18, 0),
			completedAt: null,
			canceledAt: null,
		},
		{
			title: "Coffee with Sam",
			description: "Catch up and practice being present.",
			playbook: "Phone away. Ask about their new job. Listen more than talk.",
			location: "Cafe",
			day: addAppDays(today, -2),
			startsAt: atAppTime(addAppDays(today, -2), 16, 0),
			endsAt: atAppTime(addAppDays(today, -2), 17, 0),
			completedAt: atAppTime(addAppDays(today, -2), 17, 5),
			canceledAt: null,
		},
		{
			title: "Dentist appointment",
			description: "Routine cleaning.",
			playbook: null,
			location: "Dental office",
			day: addAppDays(today, -5),
			startsAt: atAppTime(addAppDays(today, -5), 8, 0),
			endsAt: atAppTime(addAppDays(today, -5), 8, 45),
			completedAt: null,
			canceledAt: atAppTime(addAppDays(today, -6), 14, 0),
		},
	];

	await prisma.commitment.createMany({
		data: commitments.map((commitment) => ({
			...commitment,
			userId: DEMO_USER_ID,
		})),
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
