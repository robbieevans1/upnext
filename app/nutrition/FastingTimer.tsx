"use client";

import { useEffect, useState, useTransition } from "react";
import { endFastingSession, startFastingSession } from "@/app/actions/nutrition";
import { useRouter } from "next/navigation";

function formatDuration(totalSeconds: number) {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function FastingTimer({
	activeStartedAt,
	activeStartedLabel,
	defaultStartDateKey,
	defaultStartTimeKey,
	lastFastLabel,
}: {
	activeStartedAt: string | null;
	activeStartedLabel: string | null;
	defaultStartDateKey: string;
	defaultStartTimeKey: string;
	lastFastLabel: string | null;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const interval = window.setInterval(() => {
			setNow(Date.now());
		}, 1000);

		return () => window.clearInterval(interval);
	}, []);

	const elapsedSeconds = activeStartedAt
		? Math.max(
				0,
				Math.floor((now - new Date(activeStartedAt).getTime()) / 1000),
			)
		: 0;

	function handleStart(formData: FormData) {
		const startDateKey = String(formData.get("startDate") ?? "");
		const startTimeKey = String(formData.get("startTime") ?? "");

		startTransition(async () => {
			await startFastingSession(startDateKey, startTimeKey);
			router.refresh();
		});
	}

	function handleEnd() {
		startTransition(async () => {
			await endFastingSession();
			router.refresh();
		});
	}

	return (
		<section className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
			<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
						Fasting Timer
					</p>
					<h2 className="mt-3 text-5xl font-bold text-white">
						{formatDuration(elapsedSeconds)}
					</h2>
					<p className="mt-2 text-sm text-emerald-100/80">
						{activeStartedAt
							? `Fast started ${activeStartedLabel}`
							: lastFastLabel
								? `Last fast: ${lastFastLabel}`
								: "No fasting session running."}
					</p>
				</div>

				<div className="w-full sm:w-auto">
					{activeStartedAt ? (
						<button
							type="button"
							onClick={handleEnd}
							disabled={isPending}
							className="w-full rounded-xl border border-emerald-300/40 px-5 py-3 font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
						>
							End Fast
						</button>
					) : (
						<form
							action={handleStart}
							className="grid w-full gap-3 sm:w-[21rem] sm:grid-cols-[1fr_8rem]"
						>
							<div className="sm:col-span-2">
								<label className="text-xs font-semibold uppercase tracking-wide text-emerald-100/80">
									Start from
								</label>

								<div className="mt-2 grid gap-2 sm:grid-cols-[1fr_8rem]">
									<input
										type="date"
										name="startDate"
										defaultValue={defaultStartDateKey}
										className="min-w-0 rounded-xl border border-emerald-300/30 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300"
									/>
									<input
										type="time"
										name="startTime"
										defaultValue={defaultStartTimeKey}
										className="min-w-0 rounded-xl border border-emerald-300/30 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-300"
									/>
								</div>
							</div>

							<button
								disabled={isPending}
								className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
							>
								Start Fast
							</button>
						</form>
					)}
				</div>
			</div>
		</section>
	);
}
