import {
	addAppDays,
	getAppDateFromKey,
	getAppDateKey,
	getAppTodayDate,
} from "@/lib/app-date";

export type CompletionWithTask = {
	id: string;
	task: {
		title: string;
		description: string | null;
		isMandatory: boolean;
		stackOrder: number;
		group: {
			name: string;
		} | null;
	};
};

export type RecentCompletionDay = {
	completedOn: Date;
	dayKey: string;
	count: number;
};

export function getSelectedDay(dayParam: string | string[] | undefined) {
	const dayValue = Array.isArray(dayParam) ? dayParam[0] : dayParam;

	if (!dayValue) {
		return getAppTodayDate();
	}

	return getAppDateFromKey(dayValue) ?? getAppTodayDate();
}

export function getDayHref(day: Date) {
	return `/history?day=${getAppDateKey(day)}`;
}

export function getHistoryDayRange(day: Date) {
	return {
		start: day,
		end: addAppDays(day, 1),
	};
}

export function sortCompletions(completions: CompletionWithTask[]) {
	return [...completions].sort((a, b) => {
		if (a.task.isMandatory !== b.task.isMandatory) {
			return Number(b.task.isMandatory) - Number(a.task.isMandatory);
		}

		const aGroupName = a.task.group?.name ?? "";
		const bGroupName = b.task.group?.name ?? "";

		if (aGroupName !== bGroupName) {
			return aGroupName.localeCompare(bGroupName);
		}

		if (a.task.stackOrder !== b.task.stackOrder) {
			return a.task.stackOrder - b.task.stackOrder;
		}

		return a.task.title.localeCompare(b.task.title);
	});
}

export function aggregateRecentCompletionDays(
	completions: { completedOn: Date }[],
	limit = 14,
) {
	const daysByKey = new Map<string, RecentCompletionDay>();

	for (const completion of completions) {
		const dayKey = getAppDateKey(completion.completedOn);
		const existingDay = daysByKey.get(dayKey);

		if (existingDay) {
			existingDay.count += 1;
			continue;
		}

		daysByKey.set(dayKey, {
			completedOn: getAppDateFromKey(dayKey) ?? completion.completedOn,
			dayKey,
			count: 1,
		});
	}

	return Array.from(daysByKey.values())
		.sort((a, b) => b.completedOn.getTime() - a.completedOn.getTime())
		.slice(0, limit);
}
