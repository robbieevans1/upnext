"use client";

import { useState } from "react";
import { startTomorrowEarly } from "@/app/actions/day-start";

export default function CompleteDayButton({
	isStartedEarly,
	tomorrowLabel,
}: {
	isStartedEarly: boolean;
	tomorrowLabel: string;
}) {
	const [isOpen, setIsOpen] = useState(false);

	if (isStartedEarly) {
		return (
			<p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-100">
				Tomorrow&apos;s stack is already active.
			</p>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-300"
			>
				Complete Day
			</button>

			{isOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="complete-day-title"
				>
					<button
						type="button"
						aria-label="Cancel starting tomorrow early"
						onClick={() => setIsOpen(false)}
						className="absolute inset-0"
					/>

					<div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
						<h2 id="complete-day-title" className="text-2xl font-bold text-white">
							Start tomorrow early?
						</h2>
						<p className="mt-3 text-sm leading-6 text-slate-300">
							This will show the {tomorrowLabel} stack now. Tasks you have not
							completed today will stay incomplete. You can only do this once
							before the next app day starts.
						</p>

						<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
							>
								Cancel
							</button>
							<form action={startTomorrowEarly}>
								<button className="w-full rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 sm:w-auto">
									Start Tomorrow
								</button>
							</form>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
