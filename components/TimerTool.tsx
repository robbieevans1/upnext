"use client";

import { useEffect, useMemo, useState } from "react";

const timerStorageKey = "upnext.tools.timer.state";

type TimerState = {
	accumulatedSeconds: number;
	startedAtMs: number | null;
};

function getSafeTimerState(value: unknown): TimerState {
	if (
		typeof value !== "object" ||
		value === null ||
		!("accumulatedSeconds" in value) ||
		!("startedAtMs" in value)
	) {
		return {
			accumulatedSeconds: 0,
			startedAtMs: null,
		};
	}

	const accumulatedSeconds = Number(value.accumulatedSeconds);
	const parsedStartedAtMs =
		value.startedAtMs === null ? null : Number(value.startedAtMs);
	const startedAtMs =
		parsedStartedAtMs !== null &&
		Number.isFinite(parsedStartedAtMs) &&
		parsedStartedAtMs > 0
			? Math.floor(parsedStartedAtMs)
			: null;

	return {
		accumulatedSeconds:
			Number.isFinite(accumulatedSeconds) && accumulatedSeconds > 0
				? Math.floor(accumulatedSeconds)
				: 0,
		startedAtMs,
	};
}

function getElapsedSeconds(state: TimerState, nowMs: number) {
	const runningSeconds =
		state.startedAtMs === null
			? 0
			: Math.max(0, Math.floor((nowMs - state.startedAtMs) / 1000));

	return Math.max(0, state.accumulatedSeconds + runningSeconds);
}

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

export default function TimerTool() {
	const [timerState, setTimerState] = useState<TimerState>({
		accumulatedSeconds: 0,
		startedAtMs: null,
	});
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [adjustMinutes, setAdjustMinutes] = useState("5");
	const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
	const isRunning = timerState.startedAtMs !== null;
	const elapsedSeconds = useMemo(
		() => getElapsedSeconds(timerState, nowMs),
		[timerState, nowMs],
	);
	const primaryButtonLabel =
		timerState.accumulatedSeconds > 0 || elapsedSeconds > 0 ? "Continue" : "Start";

	useEffect(() => {
		queueMicrotask(() => {
			const savedValue = window.localStorage.getItem(timerStorageKey);

			if (savedValue !== null) {
				try {
					setTimerState(getSafeTimerState(JSON.parse(savedValue)));
				} catch {
					window.localStorage.removeItem(timerStorageKey);
				}
			}

			setNowMs(Date.now());
			setHasLoadedSavedState(true);
		});
	}, []);

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
		if (!hasLoadedSavedState) {
			return;
		}

		window.localStorage.setItem(timerStorageKey, JSON.stringify(timerState));
	}, [timerState, hasLoadedSavedState]);

	function startTimer() {
		setTimerState((currentState) => {
			if (currentState.startedAtMs !== null) {
				return currentState;
			}

			const nextStartedAtMs = Date.now();
			setNowMs(nextStartedAtMs);

			return {
				...currentState,
				startedAtMs: nextStartedAtMs,
			};
		});
	}

	function stopTimer() {
		setTimerState((currentState) => {
			if (currentState.startedAtMs === null) {
				return currentState;
			}

			const nextNowMs = Date.now();
			setNowMs(nextNowMs);

			return {
				accumulatedSeconds: getElapsedSeconds(currentState, nextNowMs),
				startedAtMs: null,
			};
		});
	}

	function resetTimer() {
		const nextNowMs = Date.now();
		setNowMs(nextNowMs);
		setTimerState({
			accumulatedSeconds: 0,
			startedAtMs: null,
		});
		window.localStorage.removeItem(timerStorageKey);
	}

	function adjustTimer(direction: 1 | -1) {
		const minutes = Number(adjustMinutes);

		if (!Number.isFinite(minutes) || minutes <= 0) {
			return;
		}

		const secondsDelta = Math.round(minutes * 60) * direction;
		const nextNowMs = Date.now();
		setNowMs(nextNowMs);
		setTimerState((currentState) => ({
			accumulatedSeconds: Math.max(
				0,
				getElapsedSeconds(currentState, nextNowMs) + secondsDelta,
			),
			startedAtMs: currentState.startedAtMs === null ? null : nextNowMs,
		}));
	}

	return (
		<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
						Flexible timer
					</p>
					<p className="mt-2 text-sm text-slate-400">
						Time stays saved on this device until you reset it.
					</p>
				</div>

				<span className="w-fit rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
					{isRunning ? "Running" : "Paused"}
				</span>
			</div>

			<div
				aria-live="polite"
				data-testid="timer-value"
				className="mt-6 break-words font-mono text-5xl font-bold tabular-nums text-white sm:text-7xl"
			>
				{formatDuration(elapsedSeconds)}
			</div>

			<div className="mt-6 flex flex-wrap gap-3">
				{isRunning ? (
					<button
						type="button"
						onClick={stopTimer}
						className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
					>
						Stop
					</button>
				) : (
					<button
						type="button"
						onClick={startTimer}
						className="rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
					>
						{primaryButtonLabel}
					</button>
				)}

				<button
					type="button"
					onClick={resetTimer}
					className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-300"
				>
					Reset
				</button>
			</div>

			<div className="mt-8 border-t border-slate-800 pt-6">
				<label
					htmlFor="timer-adjust-minutes"
					className="text-sm font-medium text-slate-200"
				>
					Adjust current time
				</label>

				<div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
					<input
						id="timer-adjust-minutes"
						type="number"
						min="0.5"
						step="0.5"
						value={adjustMinutes}
						onChange={(event) => setAdjustMinutes(event.target.value)}
						className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-500 sm:w-36"
					/>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={() => adjustTimer(1)}
							className="rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
						>
							Add minutes
						</button>
						<button
							type="button"
							onClick={() => adjustTimer(-1)}
							className="rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
						>
							Remove minutes
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
