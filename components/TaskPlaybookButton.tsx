"use client";

import { useId, useState } from "react";

type TaskPlaybookButtonProps = {
	taskTitle: string;
	playbook: string | null;
};

export default function TaskPlaybookButton({
	taskTitle,
	playbook,
}: TaskPlaybookButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const titleId = useId();
	const hasPlaybook = Boolean(playbook?.trim());

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:text-sky-300"
			>
				Playbook
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Close playbook overlay"
						onClick={() => setIsOpen(false)}
						className="absolute inset-0 bg-slate-950/80"
					/>

					<section
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
									Task Playbook
								</p>

								<h2 id={titleId} className="mt-2 text-2xl font-bold">
									{taskTitle}
								</h2>
							</div>

							<button
								type="button"
								aria-label="Close playbook"
								onClick={() => setIsOpen(false)}
								className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-xl leading-none text-slate-200 transition hover:border-sky-500 hover:text-sky-300"
							>
								<span aria-hidden="true">x</span>
							</button>
						</div>

						{hasPlaybook ? (
							<div className="mt-6 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900 p-4 leading-7 text-slate-200">
								{playbook}
							</div>
						) : (
							<div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
								<p className="font-semibold text-slate-200">
									No playbook yet.
								</p>

								<p className="mt-2 text-sm leading-6 text-slate-400">
									Add reminders, steps, mindset cues, or mistakes to avoid from
									the Tasks page.
								</p>
							</div>
						)}
					</section>
				</div>
			)}
		</>
	);
}
