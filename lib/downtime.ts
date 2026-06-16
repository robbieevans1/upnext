export const DOWNTIME_CATEGORIES = ["Sleep", "Social", "Eating", "Other"] as const;

export type DowntimeCategory = (typeof DOWNTIME_CATEGORIES)[number];

export function isDowntimeCategory(value: string): value is DowntimeCategory {
	return DOWNTIME_CATEGORIES.includes(value as DowntimeCategory);
}
