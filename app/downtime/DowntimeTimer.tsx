"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	startDowntimeSession,
	syncDowntimeDay,
} from "@/app/actions/downtime";
import { DOWNTIME_CATEGORIES } from "@/lib/downtime";

type CategoryTotal = {
	category: string;
	totalSeconds: number;
};

type ActiveSession = {
	category: string;
	startedAt: string;
} | null;

type ActiveTaskSession = {
	taskTitle: string;
	startedAt: string;
} | null;

type DowntimeTimerProps = {
	activeSession: ActiveSession;
	activeTaskSession: ActiveTaskSession;
	categoryTotals: CategoryTotal[];
	initialActiveElapsedSeconds: number;
	initialActiveTaskElapsedSeconds: number;
	totalSecondsToday: number;
};

function formatDuration(totalSeconds: number) {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const seconds = safeSeconds % 60;

	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
		2,
		"0",
	)}:${String(seconds).padStart(2, "0")}`;
}

export default function DowntimeTimer({
	activeSession,
	activeTaskSession,
	categoryTotals,
	initialActiveElapsedSeconds,
	initialActiveTaskElapsedSeconds,
	totalSecondsToday,
}: DowntimeTimerProps) {
	const router = useRouter();
	const [clientNow, setClientNow] = useState<number | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (!activeSession && !activeTaskSession) {
			return;
		}

		const interval = window.setInterval(() => {
			setClientNow(Date.now());
		}, 1000);

		return () => window.clearInterval(interval);
	}, [activeSession, activeTaskSession]);

	useEffect(() => {
		let isMounted = true;

		syncDowntimeDay().then((didRollover) => {
			if (isMounted && (didRollover || (!activeSession && !activeTaskSession))) {
				router.refresh();
			}
		});

		return () => {
			isMounted = false;
		};
	}, [activeSession, activeTaskSession, router]);

	useEffect(() => {
		if (!activeTaskSession) {
			return;
		}

		let isMounted = true;

		syncDowntimeDay().then((didRollover) => {
			if (isMounted && didRollover) {
				router.refresh();
			}
		});

		return () => {
			isMounted = false;
		};
	}, [activeTaskSession, router]);

	const activeElapsedSeconds = activeSession
		? clientNow === null
			? initialActiveElapsedSeconds
			: Math.floor(
					(clientNow - new Date(activeSession.startedAt).getTime()) / 1000,
				)
		: 0;
	const activeTaskElapsedSeconds = activeTaskSession
		? clientNow === null
			? initialActiveTaskElapsedSeconds
			: Math.floor(
					(clientNow - new Date(activeTaskSession.startedAt).getTime()) /
						1000,
				)
		: 0;

	const liveTotalSeconds = totalSecondsToday + activeElapsedSeconds;
	const liveCategoryTotals = useMemo(() => {
		return categoryTotals.map((categoryTotal) => {
			if (categoryTotal.category !== activeSession?.category) {
				return categoryTotal;
			}

			return {
				...categoryTotal,
				totalSeconds: categoryTotal.totalSeconds + activeElapsedSeconds,
			};
		});
	}, [activeElapsedSeconds, activeSession?.category, categoryTotals]);

	function handleStart(category: string) {
		startTransition(async () => {
			await startDowntimeSession(category);
			router.refresh();
		});
	}

	return (
		<div className="mt-8 space-y-6">
			<section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
							{activeTaskSession ? "Task Time Running" : "Today's Time Away"}
						</p>

						<p className="mt-3 font-mono text-5xl font-bold tabular-nums text-white">
							{formatDuration(
								activeTaskSession ? activeTaskElapsedSeconds : liveTotalSeconds,
							)}
						</p>

						<p className="mt-2 text-sm text-slate-400">
							{activeTaskSession
								? `${activeTaskSession.taskTitle} timer running`
								: activeSession
									? `${activeSession.category} timer running`
									: "Other timer will start automatically"}
						</p>
					</div>

					<div className="grid grid-cols-2 gap-2 sm:min-w-72">
						{DOWNTIME_CATEGORIES.map((category) => {
							const isActiveCategory = activeSession?.category === category;

							return (
								<button
									key={category}
									type="button"
									onClick={() => handleStart(category)}
									disabled={isPending || Boolean(activeTaskSession)}
									className={
										isActiveCategory
											? "rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
											: "rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
									}
								>
									{category}
								</button>
							);
						})}
					</div>
				</div>
			</section>

			<section>
				<h2 className="mb-3 text-lg font-semibold text-slate-200">
					Breakdown
				</h2>

				<div className="grid gap-3 sm:grid-cols-2">
					{liveCategoryTotals.map((categoryTotal) => (
						<div
							key={categoryTotal.category}
							className="rounded-xl border border-slate-800 bg-slate-900 p-4"
						>
							<div className="flex items-center justify-between gap-3">
								<p className="font-medium text-slate-200">
									{categoryTotal.category}
								</p>

								<p className="font-mono text-sm tabular-nums text-slate-400">
									{formatDuration(categoryTotal.totalSeconds)}
								</p>
							</div>

							<div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
								<div
									className="h-full rounded-full bg-sky-500"
									style={{
										width:
											liveTotalSeconds === 0
												? "0%"
												: `${Math.round(
														(categoryTotal.totalSeconds / liveTotalSeconds) *
															100,
													)}%`,
									}}
								/>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
