"use client";

import Link from "next/link";
import { useState } from "react";

type WeeklyReviewPromptProps = {
	weekStartLabel: string;
	weekEndLabel: string;
	reviewHref: string;
};

export default function WeeklyReviewPrompt({
	weekStartLabel,
	weekEndLabel,
	reviewHref,
}: WeeklyReviewPromptProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<section className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
			<p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
				Weekly Review
			</p>
			<h2 className="mt-2 text-lg font-bold text-slate-100">
				Review last week
			</h2>
			<p className="mt-2 text-sm leading-6 text-slate-300">
				Ask whether what you repeatedly did from {weekStartLabel} to{" "}
				{weekEndLabel} is actually moving you toward your goals.
			</p>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="mt-4 inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
			>
				Start Weekly Review
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="weekly-review-title"
						className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm font-medium text-sky-400">
									{weekStartLabel} to {weekEndLabel}
								</p>
								<h2
									id="weekly-review-title"
									className="mt-1 text-2xl font-bold text-white"
								>
									Weekly Review
								</h2>
							</div>

							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-sky-500 hover:text-sky-300"
							>
								Close
							</button>
						</div>

						<p className="mt-5 text-sm leading-6 text-slate-300">
							The review lives in History so you can see the week&apos;s completed
							tasks, untouched tasks, tracked time, downtime, commitments, and
							daily review outcomes while answering the reflection questions.
						</p>

						<div className="mt-6 flex flex-wrap justify-end gap-3">
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="rounded-xl border border-slate-600 px-4 py-2 font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-300"
							>
								Not Now
							</button>
							<Link
								href={reviewHref}
								className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-sky-400"
							>
								Go to Weekly Review
							</Link>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
