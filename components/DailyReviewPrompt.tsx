"use client";

import { useMemo, useState, useTransition } from "react";
import {
	dismissDailyReview,
	saveDailyReview,
} from "@/app/actions/daily-review";
import { useRouter } from "next/navigation";

type DailyReviewStatus = "YES" | "NO" | "SKIP" | "UNSURE";

type DailyReviewCheck = {
	id: string;
	title: string;
	description: string | null;
	result: DailyReviewStatus | null;
};

type DailyReviewPromptProps = {
	targetDayKey: string;
	targetDayLabel: string;
	checks: DailyReviewCheck[];
	wasDismissed: boolean;
};

const statusOptions: {
	label: string;
	value: DailyReviewStatus;
}[] = [
	{
		label: "Yes",
		value: "YES",
	},
	{
		label: "No",
		value: "NO",
	},
	{
		label: "Skip",
		value: "SKIP",
	},
	{
		label: "Not sure",
		value: "UNSURE",
	},
];

function getSummary(checks: DailyReviewCheck[]) {
	const answered = checks.filter((check) => check.result).length;
	const unanswered = checks.length - answered;

	if (checks.length === 0) {
		return "No daily checks configured yet.";
	}

	if (unanswered === 0) {
		return `All ${checks.length} checks answered for yesterday.`;
	}

	return `${unanswered} of ${checks.length} checks still need an answer.`;
}

export default function DailyReviewPrompt({
	targetDayKey,
	targetDayLabel,
	checks,
	wasDismissed,
}: DailyReviewPromptProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const hasUnanswered = checks.some((check) => !check.result);
	const [isOpen, setIsOpen] = useState(checks.length > 0 && hasUnanswered && !wasDismissed);
	const [selectedStatuses, setSelectedStatuses] = useState(() =>
		Object.fromEntries(
			checks
				.filter((check) => check.result)
				.map((check) => [check.id, check.result as DailyReviewStatus]),
		),
	);
	const summary = useMemo(() => getSummary(checks), [checks]);

	if (checks.length === 0) {
		return null;
	}

	function handleDismiss() {
		setIsOpen(false);
		startTransition(async () => {
			await dismissDailyReview(targetDayKey);
			router.refresh();
		});
	}

	function handleSubmit(formData: FormData) {
		startTransition(async () => {
			await saveDailyReview(formData);
			setIsOpen(false);
			router.refresh();
		});
	}

	return (
		<section className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
						Yesterday Review
					</p>
					<p className="mt-2 text-sm text-slate-300">{summary}</p>
				</div>

				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
				>
					{hasUnanswered ? "Review Yesterday" : "Update Review"}
				</button>
			</div>

			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="daily-review-title"
						className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm font-medium text-sky-400">
									{targetDayLabel}
								</p>
								<h2
									id="daily-review-title"
									className="mt-1 text-2xl font-bold text-white"
								>
									Yesterday Review
								</h2>
							</div>

							<button
								type="button"
								onClick={handleDismiss}
								disabled={isPending}
								className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Close
							</button>
						</div>

						<form action={handleSubmit} className="mt-6 space-y-4">
							<input type="hidden" name="targetDay" value={targetDayKey} />

							{checks.map((check) => (
								<div
									key={check.id}
									className="rounded-xl border border-slate-800 bg-slate-900 p-4"
								>
									<h3 className="font-semibold text-slate-100">{check.title}</h3>

									{check.description && (
										<p className="mt-1 text-sm text-slate-400">
											{check.description}
										</p>
									)}

									<div className="mt-4 grid gap-2 sm:grid-cols-4">
										{statusOptions.map((option) => {
											const inputId = `${check.id}-${option.value}`;
											const isSelected =
												selectedStatuses[check.id] === option.value;

											return (
												<label
													key={option.value}
													htmlFor={inputId}
													className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${
														isSelected
															? "border-sky-400 bg-sky-500 text-slate-950"
															: "border-slate-700 text-slate-200 hover:border-sky-500 hover:text-sky-300"
													}`}
												>
													<input
														id={inputId}
														type="radio"
														name={`status:${check.id}`}
														value={option.value}
														defaultChecked={check.result === option.value}
														onChange={() =>
															setSelectedStatuses((current) => ({
																...current,
																[check.id]: option.value,
															}))
														}
														className="sr-only"
													/>
													{option.label}
												</label>
											);
										})}
									</div>
								</div>
							))}

							<div className="flex flex-wrap justify-end gap-3">
								<button
									type="button"
									onClick={handleDismiss}
									disabled={isPending}
									className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
								>
									Do Later
								</button>

								<button
									disabled={isPending}
									className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
								>
									Save Review
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</section>
	);
}
