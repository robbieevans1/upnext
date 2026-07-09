const TASK_COMPLETION_WEEK_START_DAY = 0;

export type WeeklyTaskCompletionTotal = {
	title: string;
	count: number;
};

export type TaskCompletionTotal = {
	title: string;
	count: number;
	firstCompletedOn: Date | null;
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
	weekEnd,
	includeInactiveCompletedTasks = false,
}: {
	tasks: { id: string; title: string; isActive: boolean; createdAt?: Date }[];
	completions: { taskId: string; completedOn: Date }[];
	weekStart: Date;
	weekEnd?: Date;
	includeInactiveCompletedTasks?: boolean;
}): WeeklyTaskCompletionTotal[] {
	const tasksById = new Map(tasks.map((task) => [task.id, task]));
	const totalsByTaskId = new Map(
		tasks
			.filter((task) => {
				if (!task.isActive) {
					return false;
				}

				return !weekEnd || !task.createdAt || task.createdAt < weekEnd;
			})
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

		const existingTotal = totalsByTaskId.get(completion.taskId);

		if (existingTotal) {
			existingTotal.count += 1;
			continue;
		}

		const task = tasksById.get(completion.taskId);

		if (task && (includeInactiveCompletedTasks || task.isActive)) {
			totalsByTaskId.set(completion.taskId, {
				title: task.title,
				count: 1,
			});
		}
	}

	return Array.from(totalsByTaskId.values()).sort(
		(a, b) => b.count - a.count || a.title.localeCompare(b.title),
	);
}

export function buildTotalTaskCompletionTotals({
	tasks,
	completions,
}: {
	tasks: { id: string; title: string; isActive: boolean }[];
	completions: { taskId: string; completedOn: Date }[];
}): TaskCompletionTotal[] {
	const totalsByTaskId = new Map<string, TaskCompletionTotal>(
		tasks
			.filter((task) => task.isActive)
			.map((task) => [
				task.id,
				{
					title: task.title,
					count: 0,
					firstCompletedOn: null,
				},
			]),
	);

	for (const completion of completions) {
		const total = totalsByTaskId.get(completion.taskId);

		if (total) {
			total.count += 1;

			if (
				!total.firstCompletedOn ||
				completion.completedOn.getTime() < total.firstCompletedOn.getTime()
			) {
				total.firstCompletedOn = completion.completedOn;
			}
		}
	}

	return Array.from(totalsByTaskId.values()).sort(
		(a, b) => b.count - a.count || a.title.localeCompare(b.title),
	);
}
