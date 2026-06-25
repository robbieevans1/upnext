const TASK_COMPLETION_WEEK_START_DAY = 0;

export type WeeklyTaskCompletionTotal = {
	title: string;
	count: number;
};

export function getTaskCompletionWeekStart(today: Date) {
	let weekStart = today;

	while (weekStart.getUTCDay() !== TASK_COMPLETION_WEEK_START_DAY) {
		weekStart = new Date(weekStart);
		weekStart.setUTCDate(weekStart.getUTCDate() - 1);
	}

	return weekStart;
}

export function buildWeeklyTaskCompletionTotals({
	tasks,
	completions,
	weekStart,
}: {
	tasks: { id: string; title: string; isActive: boolean }[];
	completions: { taskId: string; completedOn: Date }[];
	weekStart: Date;
}): WeeklyTaskCompletionTotal[] {
	const totalsByTaskId = new Map(
		tasks
			.filter((task) => task.isActive)
			.map((task) => [
				task.id,
				{
					title: task.title,
					count: 0,
				},
			]),
	);

	for (const completion of completions) {
		if (completion.completedOn.getTime() < weekStart.getTime()) {
			continue;
		}

		const total = totalsByTaskId.get(completion.taskId);

		if (total) {
			total.count += 1;
		}
	}

	return Array.from(totalsByTaskId.values()).sort(
		(a, b) => b.count - a.count || a.title.localeCompare(b.title),
	);
}
