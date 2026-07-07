"use client";

import { useId, useState } from "react";
import { completeSubtask } from "@/app/actions/tasks";

type TodaySubtask = {
	id: string;
	title: string;
	isComplete: boolean;
};

type TodaySubtaskChecklistProps = {
	subtasks: TodaySubtask[];
};

export default function TodaySubtaskChecklist({
	subtasks,
}: TodaySubtaskChecklistProps) {
	const contentId = useId();
	const [isOpen, setIsOpen] = useState(false);

	if (subtasks.length === 0) {
		return null;
	}

	const completedCount = subtasks.filter((subtask) => subtask.isComplete).length;

	return (
		<div className="mt-5 border-t border-slate-800 pt-4">
			<button
				type="button"
				aria-expanded={isOpen}
				aria-controls={contentId}
				onClick={() => setIsOpen((currentValue) => !currentValue)}
				className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-left transition hover:border-sky-500/70"
			>
				<span className="min-w-0">
					<span className="block text-sm font-semibold text-slate-200">
						Subtasks
					</span>
					<span className="mt-1 block text-xs text-slate-500">
						{completedCount} of {subtasks.length} complete
					</span>
				</span>

				<span className="shrink-0 rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-sky-300">
					{isOpen ? "Hide" : "Show"}
				</span>
			</button>

			{isOpen && (
				<div id={contentId} className="mt-3 space-y-2">
					{subtasks.map((subtask) => (
						<div
							key={subtask.id}
							className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex min-w-0 items-center gap-2">
								<span
									className={`h-2.5 w-2.5 shrink-0 rounded-full ${
										subtask.isComplete ? "bg-emerald-400" : "bg-slate-600"
									}`}
								/>

								<span
									className={`break-words text-sm ${
										subtask.isComplete
											? "text-slate-500 line-through"
											: "text-slate-200"
									}`}
								>
									{subtask.title}
								</span>
							</div>

							{subtask.isComplete ? (
								<span className="self-start rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 sm:self-auto">
									Done
								</span>
							) : (
								<form action={completeSubtask.bind(null, subtask.id)}>
									<button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400">
										Complete
									</button>
								</form>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
