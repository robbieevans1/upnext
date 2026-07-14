"use client";

import { skipTask } from "@/app/actions/tasks";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TaskSkipButtonProps = {
	taskId: string;
	taskTitle: string;
	skipCountThisWeek: number;
	className: string;
};

export default function TaskSkipButton({
	taskId,
	taskTitle,
	skipCountThisWeek,
	className,
}: TaskSkipButtonProps) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const needsConfirmation = skipCountThisWeek >= 2;

	function handleSkip() {
		if (needsConfirmation) {
			setIsOpen(true);
			return;
		}

		submitSkip();
	}

	function submitSkip() {
		startTransition(async () => {
			await skipTask(taskId);
			setIsOpen(false);
			router.refresh();
		});
	}

	return (
		<>
			<button
				type="button"
				onClick={handleSkip}
				disabled={isPending}
				className={className}
			>
				Skip Today
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby={`skip-task-${taskId}-title`}
						className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
					>
						<h2
							id={`skip-task-${taskId}-title`}
							className="text-2xl font-bold text-white"
						>
							Skip this task again?
						</h2>
						<p className="mt-3 text-sm leading-6 text-slate-300">
							You have already skipped {taskTitle} {skipCountThisWeek} times
							this week. Skipping again will remove it from today&apos;s stack
							without counting as a completion or changing its last-completed
							date.
						</p>

						<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								disabled={isPending}
								className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={submitSkip}
								disabled={isPending}
								className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Yes, Skip Today
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
