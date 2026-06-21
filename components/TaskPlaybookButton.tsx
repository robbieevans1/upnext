"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskPlaybook } from "@/app/actions/tasks";

type TaskPlaybookButtonProps = {
	taskId?: string;
	taskTitle: string;
	playbook: string | null;
};

export default function TaskPlaybookButton({
	taskId,
	taskTitle,
	playbook,
}: TaskPlaybookButtonProps) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [playbookText, setPlaybookText] = useState(playbook ?? "");
	const [isPending, startTransition] = useTransition();
	const titleId = useId();
	const hasPlaybook = Boolean(playbook?.trim());
	const canEdit = Boolean(taskId);

	function handleOpen() {
		setPlaybookText(playbook ?? "");
		setIsOpen(true);
	}

	function handleSave(formData: FormData) {
		startTransition(async () => {
			await updateTaskPlaybook(formData);
			router.refresh();
			setIsOpen(false);
		});
	}

	return (
		<>
			<button
				type="button"
				onClick={handleOpen}
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
						className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl sm:p-8"
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

						{canEdit ? (
							<form action={handleSave} className="mt-6">
								<input type="hidden" name="taskId" value={taskId} />

								<label
									htmlFor={`${titleId}-playbook`}
									className="text-sm font-medium text-slate-300"
								>
									Playbook notes
								</label>
								<textarea
									id={`${titleId}-playbook`}
									name="playbook"
									value={playbookText}
									onChange={(event) => setPlaybookText(event.target.value)}
									placeholder="Add reminders, steps, mindset cues, or mistakes to avoid."
									className="mt-3 min-h-[55vh] w-full min-w-0 resize-y rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 text-base leading-7 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500"
								/>

								<div className="mt-5 flex flex-wrap justify-end gap-3">
									<button
										type="button"
										onClick={() => setIsOpen(false)}
										className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
									>
										Cancel
									</button>
									<button
										disabled={isPending}
										className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
									>
										{isPending ? "Saving..." : "Save Playbook"}
									</button>
								</div>
							</form>
						) : hasPlaybook ? (
							<div className="mt-6 min-h-[45vh] whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900 p-4 leading-7 text-slate-200">
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
