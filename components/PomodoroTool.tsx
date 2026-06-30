"use client";

import { useEffect, useMemo, useState } from "react";

const pomodoroStorageKey = "upnext.tools.pomodoro.state";
const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const MIN_WORK_MINUTES = 1;
const MIN_BREAK_MINUTES = 5;
const MAX_BREAK_MINUTES = 10;

type PomodoroMode = "work" | "break";

type PomodoroState = {
	mode: PomodoroMode;
	workMinutes: number;
	breakMinutes: number;
	remainingSeconds: number;
	endsAtMs: number | null;
};

function clamp(value: number, min: number, max: number) {
	if (!Number.isFinite(value)) {
		return min;
	}

	return Math.min(max, Math.max(min, value));
}

function getModeDurationSeconds(
	mode: PomodoroMode,
	workMinutes: number,
	breakMinutes: number,
) {
	return (mode === "work" ? workMinutes : breakMinutes) * 60;
}

function getDefaultState(): PomodoroState {
	return {
		mode: "work",
		workMinutes: DEFAULT_WORK_MINUTES,
		breakMinutes: DEFAULT_BREAK_MINUTES,
		remainingSeconds: DEFAULT_WORK_MINUTES * 60,
		endsAtMs: null,
	};
}

function getSafePomodoroState(value: unknown): PomodoroState {
	if (
		typeof value !== "object" ||
		value === null ||
		!("mode" in value) ||
		!("workMinutes" in value) ||
		!("breakMinutes" in value) ||
		!("remainingSeconds" in value) ||
		!("endsAtMs" in value)
	) {
		return getDefaultState();
	}

	const mode: PomodoroMode = value.mode === "break" ? "break" : "work";
	const workMinutes = Math.round(
		clamp(Number(value.workMinutes), MIN_WORK_MINUTES, 180),
	);
	const breakMinutes = Math.round(
		clamp(Number(value.breakMinutes), MIN_BREAK_MINUTES, MAX_BREAK_MINUTES),
	);
	const modeDurationSeconds = getModeDurationSeconds(
		mode,
		workMinutes,
		breakMinutes,
	);
	const remainingSeconds = Math.round(
		clamp(Number(value.remainingSeconds), 0, modeDurationSeconds),
	);
	const parsedEndsAtMs = value.endsAtMs === null ? null : Number(value.endsAtMs);
	const endsAtMs =
		parsedEndsAtMs !== null &&
		Number.isFinite(parsedEndsAtMs) &&
		parsedEndsAtMs > 0
			? Math.floor(parsedEndsAtMs)
			: null;

	return {
		mode,
		workMinutes,
		breakMinutes,
		remainingSeconds,
		endsAtMs,
	};
}

function getRemainingSeconds(state: PomodoroState, nowMs: number) {
	if (state.endsAtMs === null) {
		return state.remainingSeconds;
	}

	return Math.max(0, Math.ceil((state.endsAtMs - nowMs) / 1000));
}

function formatDuration(totalSeconds: number) {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const minutes = Math.floor(safeSeconds / 60);
	const seconds = safeSeconds % 60;

	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
		2,
		"0",
	)}`;
}

export default function PomodoroTool() {
	const [pomodoroState, setPomodoroState] =
		useState<PomodoroState>(getDefaultState);
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
	const isRunning = pomodoroState.endsAtMs !== null;
	const remainingSeconds = useMemo(
		() => getRemainingSeconds(pomodoroState, nowMs),
		[pomodoroState, nowMs],
	);

	useEffect(() => {
		queueMicrotask(() => {
			const savedValue = window.localStorage.getItem(pomodoroStorageKey);

			if (savedValue !== null) {
				try {
					setPomodoroState(getSafePomodoroState(JSON.parse(savedValue)));
				} catch {
					window.localStorage.removeItem(pomodoroStorageKey);
				}
			}

			setNowMs(Date.now());
			setHasLoadedSavedState(true);
		});
	}, []);

	useEffect(() => {
		if (!hasLoadedSavedState) {
			return;
		}

		window.localStorage.setItem(
			pomodoroStorageKey,
			JSON.stringify(pomodoroState),
		);
	}, [pomodoroState, hasLoadedSavedState]);

	useEffect(() => {
		if (!isRunning) {
			return;
		}

		const interval = window.setInterval(() => {
			setNowMs(Date.now());
		}, 1000);

		return () => window.clearInterval(interval);
	}, [isRunning]);

	useEffect(() => {
		if (!isRunning || remainingSeconds > 0) {
			return;
		}

		setPomodoroState((currentState) => ({
			...currentState,
			remainingSeconds: 0,
			endsAtMs: null,
		}));
	}, [isRunning, remainingSeconds]);

	function startTimer() {
		setPomodoroState((currentState) => {
			if (currentState.endsAtMs !== null) {
				return currentState;
			}

			const nextNowMs = Date.now();
			const seconds =
				currentState.remainingSeconds > 0
					? currentState.remainingSeconds
					: getModeDurationSeconds(
							currentState.mode,
							currentState.workMinutes,
							currentState.breakMinutes,
						);
			setNowMs(nextNowMs);

			return {
				...currentState,
				remainingSeconds: seconds,
				endsAtMs: nextNowMs + seconds * 1000,
			};
		});
	}

	function pauseTimer() {
		setPomodoroState((currentState) => {
			if (currentState.endsAtMs === null) {
				return currentState;
			}

			const nextNowMs = Date.now();
			setNowMs(nextNowMs);

			return {
				...currentState,
				remainingSeconds: getRemainingSeconds(currentState, nextNowMs),
				endsAtMs: null,
			};
		});
	}

	function resetTimer() {
		setNowMs(Date.now());
		setPomodoroState((currentState) => ({
			...currentState,
			remainingSeconds: getModeDurationSeconds(
				currentState.mode,
				currentState.workMinutes,
				currentState.breakMinutes,
			),
			endsAtMs: null,
		}));
	}

	function switchMode(mode: PomodoroMode) {
		setNowMs(Date.now());
		setPomodoroState((currentState) => ({
			...currentState,
			mode,
			remainingSeconds: getModeDurationSeconds(
				mode,
				currentState.workMinutes,
				currentState.breakMinutes,
			),
			endsAtMs: null,
		}));
	}

	function updateWorkMinutes(value: string) {
		const workMinutes = Math.round(clamp(Number(value), MIN_WORK_MINUTES, 180));
		setNowMs(Date.now());
		setPomodoroState((currentState) => ({
			...currentState,
			workMinutes,
			remainingSeconds:
				currentState.mode === "work"
					? workMinutes * 60
					: currentState.remainingSeconds,
			endsAtMs: null,
		}));
	}

	function updateBreakMinutes(value: string) {
		const breakMinutes = Math.round(
			clamp(Number(value), MIN_BREAK_MINUTES, MAX_BREAK_MINUTES),
		);
		setNowMs(Date.now());
		setPomodoroState((currentState) => ({
			...currentState,
			breakMinutes,
			remainingSeconds:
				currentState.mode === "break"
					? breakMinutes * 60
					: currentState.remainingSeconds,
			endsAtMs: null,
		}));
	}

	function startNextSession() {
		const nextMode = pomodoroState.mode === "work" ? "break" : "work";
		switchMode(nextMode);
	}

	return (
		<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
						Pomodoro
					</p>
					<p className="mt-2 text-sm text-slate-400">
						Adjust the work block and keep breaks between 5 and 10 minutes.
					</p>
				</div>

				<span className="w-fit rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
					{isRunning ? "Running" : "Paused"}
				</span>
			</div>

			<div className="mt-6 flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => switchMode("work")}
					aria-pressed={pomodoroState.mode === "work"}
					className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
						pomodoroState.mode === "work"
							? "border-sky-400 bg-sky-500/10 text-sky-200"
							: "border-slate-700 text-slate-300 hover:border-sky-400 hover:text-sky-300"
					}`}
				>
					Work
				</button>
				<button
					type="button"
					onClick={() => switchMode("break")}
					aria-pressed={pomodoroState.mode === "break"}
					className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
						pomodoroState.mode === "break"
							? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
							: "border-slate-700 text-slate-300 hover:border-emerald-400 hover:text-emerald-300"
					}`}
				>
					Break
				</button>
			</div>

			<div
				aria-live="polite"
				data-testid="pomodoro-value"
				className="mt-6 break-words font-mono text-6xl font-bold tabular-nums text-white sm:text-7xl"
			>
				{formatDuration(remainingSeconds)}
			</div>

			<p className="mt-3 text-sm font-medium text-slate-300">
				{pomodoroState.mode === "work" ? "Work session" : "Break session"}
			</p>

			<div className="mt-6 grid gap-4 sm:grid-cols-2">
				<label className="block">
					<span className="text-sm font-medium text-slate-200">
						Work minutes
					</span>
					<input
						type="number"
						min={MIN_WORK_MINUTES}
						max={180}
						step={1}
						value={pomodoroState.workMinutes}
						onChange={(event) => updateWorkMinutes(event.target.value)}
						className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-500"
					/>
				</label>

				<label className="block">
					<span className="text-sm font-medium text-slate-200">
						Break minutes
					</span>
					<input
						type="number"
						min={MIN_BREAK_MINUTES}
						max={MAX_BREAK_MINUTES}
						step={1}
						value={pomodoroState.breakMinutes}
						onChange={(event) => updateBreakMinutes(event.target.value)}
						className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-500"
					/>
				</label>
			</div>

			<div className="mt-6 flex flex-wrap gap-3">
				{isRunning ? (
					<button
						type="button"
						onClick={pauseTimer}
						className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
					>
						Pause
					</button>
				) : (
					<button
						type="button"
						onClick={startTimer}
						className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
					>
						Start
					</button>
				)}

				<button
					type="button"
					onClick={resetTimer}
					className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
				>
					Reset
				</button>
				<button
					type="button"
					onClick={startNextSession}
					className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
				>
					Next session
				</button>
			</div>
		</section>
	);
}
