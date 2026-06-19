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

export type DashboardDowntimeSession = {
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
	downtimeSessions: DashboardDowntimeSession[];
	actionItems: DashboardActionItem[];
	commitments: DashboardCommitment[];
	today: Date;
	now?: Date;
	days?: number;
};

function getStoppedDurationSeconds(
	session: DashboardDowntimeSession,
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

export function buildDashboardAnalytics({
	tasks,
	downtimeSessions,
	actionItems,
	commitments,
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
	const completionRate =
		totalPossibleTaskCompletions === 0
			? 0
			: Math.round((totalCompletions / totalPossibleTaskCompletions) * 100);

	return {
		days,
		dayBuckets,
		completionRate,
		totalCompletions,
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
