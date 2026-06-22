import {
	addAppDays,
	formatAppDate,
	getAppDateKey,
	getAppTodayDate,
} from "@/lib/app-date";
import { DOWNTIME_CATEGORIES } from "@/lib/downtime";

type DashboardTask = {
	id: string;
	title: string;
	isActive: boolean;
	isMandatory: boolean;
	playbook: string | null;
	group: {
		name: string;
	} | null;
	completions: {
		completedOn: Date;
	}[];
};

type DashboardTaskSession = {
	taskId: string;
	startedAt: Date;
	stoppedAt: Date | null;
	task: {
		title: string;
		isActive?: boolean;
	};
};

type DashboardDowntimeSession = {
	category: string;
	day: Date;
	startedAt: Date;
	stoppedAt: Date | null;
};

type DashboardActionItem = {
	dueOn: Date | null;
	completedAt: Date | null;
	canceledAt: Date | null;
	playbook: string | null;
};

type DashboardDailyCheckResult = {
	status: "YES" | "NO" | "SKIP" | "UNSURE";
	targetDay: Date;
	dailyCheck: {
		title: string;
	};
};

export type DashboardCommitment = {
	day: Date;
	startsAt: Date | null;
	endsAt: Date | null;
	completedAt: Date | null;
	canceledAt: Date | null;
	playbook: string | null;
};

export type DashboardAnalyticsInput = {
	tasks: DashboardTask[];
	taskSessions?: DashboardTaskSession[];
	lifetimeTaskSessions?: DashboardTaskSession[];
	downtimeSessions: DashboardDowntimeSession[];
	actionItems: DashboardActionItem[];
	commitments: DashboardCommitment[];
	dailyCheckResults?: DashboardDailyCheckResult[];
	today: Date;
	now?: Date;
	days?: number;
};

function getStoppedDurationSeconds(
	session: {
		startedAt: Date;
		stoppedAt: Date | null;
	},
	now: Date,
) {
	const stoppedAt = session.stoppedAt ?? now;

	return Math.max(
		0,
		Math.floor((stoppedAt.getTime() - session.startedAt.getTime()) / 1000),
	);
}

function getCommitmentDurationSeconds(commitment: DashboardCommitment) {
	if (!commitment.startsAt || !commitment.endsAt) {
		return 0;
	}

	return Math.max(
		0,
		Math.floor(
			(commitment.endsAt.getTime() - commitment.startsAt.getTime()) / 1000,
		),
	);
}

function hasPlaybook(value: string | null) {
	return Boolean(value?.trim());
}

function buildTaskTimeTotals(
	taskSessions: DashboardTaskSession[],
	now: Date,
	{ activeOnly = false }: { activeOnly?: boolean } = {},
) {
	const taskTimeTotals = new Map<
		string,
		{ title: string; totalSeconds: number }
	>();

	for (const taskSession of taskSessions) {
		if (activeOnly && !taskSession.task.isActive) {
			continue;
		}

		const existingTotal = taskTimeTotals.get(taskSession.taskId) ?? {
			title: taskSession.task.title,
			totalSeconds: 0,
		};

		existingTotal.totalSeconds += getStoppedDurationSeconds(taskSession, now);
		taskTimeTotals.set(taskSession.taskId, existingTotal);
	}

	return Array.from(taskTimeTotals.values())
		.filter((task) => task.totalSeconds > 0)
		.sort(
			(a, b) =>
				b.totalSeconds - a.totalSeconds || a.title.localeCompare(b.title),
		);
}

export function buildDashboardAnalytics({
	tasks,
	taskSessions = [],
	lifetimeTaskSessions = [],
	downtimeSessions,
	actionItems,
	commitments,
	dailyCheckResults = [],
	today,
	now = new Date(),
	days = 14,
}: DashboardAnalyticsInput) {
	const startDay = addAppDays(today, -(days - 1));
	const activeTasks = tasks.filter((task) => task.isActive);
	const totalPossibleTaskCompletions = activeTasks.length * days;
	const dayBuckets = Array.from({ length: days }, (_, index) => {
		const day = addAppDays(startDay, index);

		return {
			day,
			dayKey: getAppDateKey(day),
			label: formatAppDate(day),
			completions: 0,
			downtimeSeconds: 0,
			commitmentSeconds: 0,
		};
	});
	const dayBucketByKey = new Map(
		dayBuckets.map((bucket) => [bucket.dayKey, bucket]),
	);
	const groupCompletionTotals = new Map<string, number>();
	const taskCompletionTotals = new Map<
		string,
		{
			title: string;
			count: number;
			lastCompletedOn: Date | null;
		}
	>();

	for (const task of tasks) {
		taskCompletionTotals.set(task.id, {
			title: task.title,
			count: 0,
			lastCompletedOn: null,
		});

		for (const completion of task.completions) {
			const completionKey = getAppDateKey(completion.completedOn);
			const bucket = dayBucketByKey.get(completionKey);

			if (!bucket) {
				continue;
			}

			bucket.completions += 1;

			const groupName = task.group?.name ?? "Ungrouped";
			groupCompletionTotals.set(
				groupName,
				(groupCompletionTotals.get(groupName) ?? 0) + 1,
			);

			const taskTotal = taskCompletionTotals.get(task.id);
			if (taskTotal) {
				taskTotal.count += 1;
				if (
					!taskTotal.lastCompletedOn ||
					completion.completedOn.getTime() >
						taskTotal.lastCompletedOn.getTime()
				) {
					taskTotal.lastCompletedOn = completion.completedOn;
				}
			}
		}
	}

	const downtimeCategoryTotals = DOWNTIME_CATEGORIES.map((category) => ({
		category,
		totalSeconds: 0,
	}));
	const downtimeCategoryByName = new Map(
		downtimeCategoryTotals.map((category) => [category.category, category]),
	);

	for (const downtimeSession of downtimeSessions) {
		const sessionKey = getAppDateKey(downtimeSession.day);
		const bucket = dayBucketByKey.get(sessionKey);
		const duration = getStoppedDurationSeconds(downtimeSession, now);

		if (bucket) {
			bucket.downtimeSeconds += duration;
		}

		const categoryTotal = downtimeCategoryByName.get(
			downtimeSession.category as (typeof DOWNTIME_CATEGORIES)[number],
		);
		if (categoryTotal) {
			categoryTotal.totalSeconds += duration;
		}
	}

	for (const commitment of commitments) {
		const commitmentKey = getAppDateKey(commitment.day);
		const bucket = dayBucketByKey.get(commitmentKey);

		if (bucket) {
			bucket.commitmentSeconds += getCommitmentDurationSeconds(commitment);
		}
	}

	const totalCompletions = dayBuckets.reduce(
		(total, bucket) => total + bucket.completions,
		0,
	);
	const totalDowntimeSeconds = dayBuckets.reduce(
		(total, bucket) => total + bucket.downtimeSeconds,
		0,
	);
	const taskTimeTotals = buildTaskTimeTotals(taskSessions, now);
	const lifetimeTaskTimeTotals = buildTaskTimeTotals(lifetimeTaskSessions, now, {
		activeOnly: true,
	});
	const totalTaskSeconds = taskTimeTotals.reduce(
		(total, task) => total + task.totalSeconds,
		0,
	);
	const totalLifetimeTaskSeconds = lifetimeTaskTimeTotals.reduce(
		(total, task) => total + task.totalSeconds,
		0,
	);
	const totalCommitmentSeconds = dayBuckets.reduce(
		(total, bucket) => total + bucket.commitmentSeconds,
		0,
	);
	const completedActionItems = actionItems.filter(
		(item) => item.completedAt && !item.canceledAt,
	).length;
	const canceledActionItems = actionItems.filter(
		(item) => item.canceledAt,
	).length;
	const openActionItems = actionItems.filter(
		(item) => !item.completedAt && !item.canceledAt,
	).length;
	const overdueActionItems = actionItems.filter(
		(item) =>
			!item.completedAt &&
			!item.canceledAt &&
			item.dueOn !== null &&
			getAppTodayDate(item.dueOn).getTime() < today.getTime(),
	).length;
	const completedCommitments = commitments.filter(
		(commitment) => commitment.completedAt && !commitment.canceledAt,
	).length;
	const canceledCommitments = commitments.filter(
		(commitment) => commitment.canceledAt,
	).length;
	const upcomingCommitments = commitments.filter(
		(commitment) =>
			!commitment.completedAt &&
			!commitment.canceledAt &&
			commitment.day.getTime() >= today.getTime(),
	).length;
	const playbookEligibleItems = [
		...tasks.map((task) => task.playbook),
		...actionItems.map((item) => item.playbook),
		...commitments.map((commitment) => commitment.playbook),
	];
	const playbookCount = playbookEligibleItems.filter(hasPlaybook).length;
	const dailyReviewSummary = {
		total: dailyCheckResults.length,
		yes: dailyCheckResults.filter((result) => result.status === "YES").length,
		no: dailyCheckResults.filter((result) => result.status === "NO").length,
		skip: dailyCheckResults.filter((result) => result.status === "SKIP").length,
		unsure: dailyCheckResults.filter((result) => result.status === "UNSURE")
			.length,
	};
	const dailyReviewAnswered =
		dailyReviewSummary.yes + dailyReviewSummary.no;
	const dailyReviewSuccessRate =
		dailyReviewAnswered === 0
			? 0
			: Math.round((dailyReviewSummary.yes / dailyReviewAnswered) * 100);
	const dailyCheckTotals = new Map<
		string,
		{
			title: string;
			yes: number;
			no: number;
			skip: number;
			unsure: number;
		}
	>();

	for (const result of dailyCheckResults) {
		const total = dailyCheckTotals.get(result.dailyCheck.title) ?? {
			title: result.dailyCheck.title,
			yes: 0,
			no: 0,
			skip: 0,
			unsure: 0,
		};

		if (result.status === "YES") total.yes += 1;
		if (result.status === "NO") total.no += 1;
		if (result.status === "SKIP") total.skip += 1;
		if (result.status === "UNSURE") total.unsure += 1;

		dailyCheckTotals.set(result.dailyCheck.title, total);
	}
	const completionRate =
		totalPossibleTaskCompletions === 0
			? 0
			: Math.round((totalCompletions / totalPossibleTaskCompletions) * 100);

	return {
		days,
		dayBuckets,
		completionRate,
		totalCompletions,
		totalTaskSeconds,
		totalLifetimeTaskSeconds,
		totalDowntimeSeconds,
		totalCommitmentSeconds,
		activeTaskCount: activeTasks.length,
		mandatoryTaskCount: activeTasks.filter((task) => task.isMandatory).length,
		groupCompletionTotals: Array.from(groupCompletionTotals.entries())
			.map(([name, count]) => ({
				name,
				count,
			}))
			.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
		taskCompletionTotals: Array.from(taskCompletionTotals.values())
			.filter((task) => task.count > 0)
			.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
		taskTimeTotals,
		lifetimeTaskTimeTotals,
		downtimeCategoryTotals,
		actionItemSummary: {
			open: openActionItems,
			overdue: overdueActionItems,
			completed: completedActionItems,
			canceled: canceledActionItems,
		},
		commitmentSummary: {
			upcoming: upcomingCommitments,
			completed: completedCommitments,
			canceled: canceledCommitments,
		},
		dailyReviewSummary: {
			...dailyReviewSummary,
			successRate: dailyReviewSuccessRate,
		},
		dailyCheckTotals: Array.from(dailyCheckTotals.values()).sort(
			(a, b) => b.yes - a.yes || a.title.localeCompare(b.title),
		),
		playbookSummary: {
			total: playbookEligibleItems.length,
			withPlaybook: playbookCount,
			coverage:
				playbookEligibleItems.length === 0
					? 0
					: Math.round((playbookCount / playbookEligibleItems.length) * 100),
		},
	};
}

export function formatHours(seconds: number) {
	const hours = seconds / 3600;

	if (hours < 0.1) {
		return "0h";
	}

	return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
}
