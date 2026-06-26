type TaskCompletionForAverage = {
	taskId: string;
	completedOn: Date;
};

type TaskSessionForAverage = {
	taskId: string;
	day: Date;
	startedAt: Date;
	stoppedAt: Date | null;
};

export type TaskAverageTimeSummary = {
	averageSeconds: number;
	timedCompletionCount: number;
};

function getTaskDayKey(taskId: string, day: Date) {
	return `${taskId}:${day.getTime()}`;
}

export function getTaskSessionDurationSeconds(
	session: {
		startedAt: Date;
		stoppedAt: Date | null;
	},
	now = new Date(),
) {
	const stoppedAt = session.stoppedAt ?? now;

	return Math.max(
		0,
		Math.floor((stoppedAt.getTime() - session.startedAt.getTime()) / 1000),
	);
}

export function buildTaskAverageTimeSummaries({
	completions,
	sessions,
	now = new Date(),
}: {
	completions: TaskCompletionForAverage[];
	sessions: TaskSessionForAverage[];
	now?: Date;
}) {
	const secondsByTaskDay = new Map<string, number>();

	for (const session of sessions) {
		const taskDayKey = getTaskDayKey(session.taskId, session.day);
		const durationSeconds = getTaskSessionDurationSeconds(session, now);

		secondsByTaskDay.set(
			taskDayKey,
			(secondsByTaskDay.get(taskDayKey) ?? 0) + durationSeconds,
		);
	}

	const totalsByTaskId = new Map<
		string,
		{
			totalSeconds: number;
			timedCompletionCount: number;
		}
	>();

	for (const completion of completions) {
		const taskDayKey = getTaskDayKey(completion.taskId, completion.completedOn);
		const totalSeconds = secondsByTaskDay.get(taskDayKey) ?? 0;

		if (totalSeconds <= 0) {
			continue;
		}

		const taskTotal = totalsByTaskId.get(completion.taskId) ?? {
			totalSeconds: 0,
			timedCompletionCount: 0,
		};

		taskTotal.totalSeconds += totalSeconds;
		taskTotal.timedCompletionCount += 1;
		totalsByTaskId.set(completion.taskId, taskTotal);
	}

	return new Map(
		Array.from(totalsByTaskId.entries()).map(([taskId, summary]) => [
			taskId,
			{
				averageSeconds: Math.round(
					summary.totalSeconds / summary.timedCompletionCount,
				),
				timedCompletionCount: summary.timedCompletionCount,
			},
		]),
	);
}
