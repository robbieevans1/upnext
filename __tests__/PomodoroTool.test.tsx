import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PomodoroTool from "@/components/PomodoroTool";

const pomodoroStorageKey = "upnext.tools.pomodoro.state";

describe("PomodoroTool", () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function flushEffects() {
		await act(async () => {
			await Promise.resolve();
		});
	}

	it("starts, pauses, and resets a work session", async () => {
		render(<PomodoroTool />);
		await flushEffects();

		const value = screen.getByTestId("pomodoro-value");

		expect(value).toHaveTextContent("25:00");
		expect(screen.getByText("Work session")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Start" }));

		act(() => {
			vi.advanceTimersByTime(30_000);
		});

		expect(value).toHaveTextContent("24:30");

		fireEvent.click(screen.getByRole("button", { name: "Pause" }));

		expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
		expect(value).toHaveTextContent("24:30");

		fireEvent.click(screen.getByRole("button", { name: "Reset" }));

		expect(value).toHaveTextContent("25:00");
	});

	it("adjusts work minutes and constrains break minutes to 5 through 10", async () => {
		render(<PomodoroTool />);
		await flushEffects();

		const value = screen.getByTestId("pomodoro-value");
		const workInput = screen.getByLabelText("Work minutes");
		const breakInput = screen.getByLabelText("Break minutes");

		fireEvent.change(workInput, {
			target: {
				value: "45",
			},
		});

		expect(value).toHaveTextContent("45:00");

		fireEvent.click(screen.getByRole("button", { name: "Break" }));

		expect(value).toHaveTextContent("05:00");

		fireEvent.change(breakInput, {
			target: {
				value: "3",
			},
		});

		expect(breakInput).toHaveValue(5);
		expect(value).toHaveTextContent("05:00");

		fireEvent.change(breakInput, {
			target: {
				value: "14",
			},
		});

		expect(breakInput).toHaveValue(10);
		expect(value).toHaveTextContent("10:00");
	});

	it("switches to the next session", async () => {
		render(<PomodoroTool />);
		await flushEffects();

		fireEvent.click(screen.getByRole("button", { name: "Next session" }));

		expect(screen.getByText("Break session")).toBeInTheDocument();
		expect(screen.getByTestId("pomodoro-value")).toHaveTextContent("05:00");

		fireEvent.click(screen.getByRole("button", { name: "Next session" }));

		expect(screen.getByText("Work session")).toBeInTheDocument();
		expect(screen.getByTestId("pomodoro-value")).toHaveTextContent("25:00");
	});

	it("shows a dismissible alarm when the session ends", async () => {
		render(<PomodoroTool />);
		await flushEffects();

		fireEvent.change(screen.getByLabelText("Work minutes"), {
			target: {
				value: "1",
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Start" }));

		act(() => {
			vi.advanceTimersByTime(60_000);
		});
		await flushEffects();

		expect(screen.getByText("Time is up.")).toBeInTheDocument();
		expect(screen.getByTestId("pomodoro-value")).toHaveTextContent("00:00");

		fireEvent.click(screen.getByRole("button", { name: "Stop alarm" }));

		expect(screen.queryByText("Time is up.")).toBeNull();
	});

	it("loads a saved running pomodoro and keeps counting", async () => {
		window.localStorage.setItem(
			pomodoroStorageKey,
			JSON.stringify({
				mode: "work",
				workMinutes: 30,
				breakMinutes: 7,
				remainingSeconds: 1800,
				endsAtMs: new Date("2026-06-30T12:30:00.000Z").getTime(),
			}),
		);

		render(<PomodoroTool />);
		await flushEffects();

		expect(screen.getByTestId("pomodoro-value")).toHaveTextContent("30:00");

		act(() => {
			vi.advanceTimersByTime(1_000);
		});

		expect(screen.getByTestId("pomodoro-value")).toHaveTextContent("29:59");
	});
});
