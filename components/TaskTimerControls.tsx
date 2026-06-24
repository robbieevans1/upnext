"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeTask, startTaskTimer, stopTaskTimer } from "@/app/actions/tasks";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";

type TaskTimerControlsProps = {
	taskId: string;
	taskTitle: string;
	playbook: string | null;
	activeTaskSession:
		| {
				taskId: string;
				startedAt: string;
		  }
		| null;
	completeButtonClassName: string;
	startButtonClassName: string;
	initialElapsedSeconds?: number;
	isCompleted?: boolean;
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

export default function TaskTimerControls({
	taskId,
	taskTitle,
	playbook,
	activeTaskSession,
	completeButtonClassName,
	startButtonClassName,
	initialElapsedSeconds = 0,
	isCompleted = false,
}: TaskTimerControlsProps) {
	const router = useRouter();
	const [clientNow, setClientNow] = useState<number | null>(null);
	const [isPending, startTransition] = useTransition();
	const isThisTaskRunning = activeTaskSession?.taskId === taskId;
	const isAnotherTaskRunning = Boolean(activeTaskSession && !isThisTaskRunning);
	const activeStartedAtMs =
		isThisTaskRunning && activeTaskSession
			? new Date(activeTaskSession.startedAt).getTime()
			: null;
	const elapsedSeconds =
		activeStartedAtMs === null
			? 0
			: clientNow === null
				? initialElapsedSeconds
				: Math.floor((clientNow - activeStartedAtMs) / 1000);

	useEffect(() => {
		if (activeStartedAtMs === null) {
			return;
		}

		const interval = window.setInterval(() => {
			setClientNow(Date.now());
		}, 1000);

		return () => window.clearInterval(interval);
	}, [activeStartedAtMs]);

	function handleStart() {
		startTransition(async () => {
			await startTaskTimer(taskId);
			router.refresh();
		});
	}

	function handleComplete() {
		startTransition(async () => {
			if (isCompleted) {
				await stopTaskTimer(taskId);
			} else {
				await completeTask(taskId);
			}
			router.refresh();
		});
	}

	return (
		<div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
			<TaskPlaybookButton
				taskId={taskId}
				taskTitle={taskTitle}
				playbook={playbook}
				highlightWhenHasPlaybook
			/>

			{isThisTaskRunning && (
				<span className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 font-mono text-sm tabular-nums text-sky-200">
					{formatDuration(elapsedSeconds)}
				</span>
			)}

			{isThisTaskRunning ? (
				<button
					type="button"
					onClick={handleComplete}
					disabled={isPending}
					className={completeButtonClassName}
				>
					{isCompleted ? "Stop" : "Complete"}
				</button>
			) : (
				<button
					type="button"
					onClick={handleStart}
					disabled={isPending || isAnotherTaskRunning}
					className={startButtonClassName}
				>
					{isAnotherTaskRunning
						? "Timer Running"
						: isCompleted
							? "Continue"
							: "Start"}
				</button>
			)}
		</div>
	);
}
