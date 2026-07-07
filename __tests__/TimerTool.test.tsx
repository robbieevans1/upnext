import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TimerTool from "@/components/TimerTool";

const timerStorageKey = "upnext.tools.timer.state";
const timerEntriesStorageKey = "upnext.tools.timer.entries";

describe("TimerTool", () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-29T12:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function flushEffects() {
		await act(async () => {
			await Promise.resolve();
		});
	}

	it("starts, stops, continues, and resets the timer", async () => {
		render(<TimerTool />);
		await flushEffects();

		const value = screen.getByTestId("timer-value");

		expect(value).toHaveTextContent("00:00:00");

		fireEvent.click(screen.getByRole("button", { name: "Start" }));

		act(() => {
			vi.advanceTimersByTime(3_000);
		});

		expect(value).toHaveTextContent("00:00:03");

		fireEvent.click(screen.getByRole("button", { name: "Stop" }));

		expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
		expect(value).toHaveTextContent("00:00:03");

		fireEvent.click(screen.getByRole("button", { name: "Continue" }));
		act(() => {
			vi.advanceTimersByTime(2_000);
		});

		expect(value).toHaveTextContent("00:00:05");

		fireEvent.click(screen.getByRole("button", { name: "Reset" }));

		expect(value).toHaveTextContent("00:00:00");
		expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
	});

	it("saves the current time as a dated entry and resets the timer", async () => {
		render(<TimerTool />);
		await flushEffects();

		expect(screen.getByRole("button", { name: "Save time" })).toBeDisabled();

		fireEvent.click(screen.getByRole("button", { name: "Start" }));

		act(() => {
			vi.advanceTimersByTime(90_000);
		});

		fireEvent.click(screen.getByRole("button", { name: "Save time" }));
		await flushEffects();

		expect(screen.getByTestId("timer-value")).toHaveTextContent("00:00:00");
		expect(screen.getByText("2026-06-29")).toBeInTheDocument();
		expect(screen.getAllByText("00:01:30")).toHaveLength(2);
		expect(screen.getByText("1 saved")).toBeInTheDocument();
		expect(JSON.parse(window.localStorage.getItem(timerEntriesStorageKey) ?? "[]"))
			.toEqual([
				expect.objectContaining({
					day: "2026-06-29",
					seconds: 90,
					savedAtMs: new Date("2026-06-29T12:01:30.000Z").getTime(),
				}),
			]);
	});

	it("loads saved timer entries", async () => {
		window.localStorage.setItem(
			timerEntriesStorageKey,
			JSON.stringify([
				{
					id: "entry-1",
					day: "2026-06-28",
					seconds: 3600,
					savedAtMs: new Date("2026-06-28T23:00:00.000Z").getTime(),
				},
			]),
		);

		render(<TimerTool />);
		await flushEffects();

		expect(screen.getByText("2026-06-28")).toBeInTheDocument();
		expect(screen.getAllByText("01:00:00")).toHaveLength(2);
		expect(screen.getByText("1 saved")).toBeInTheDocument();
	});

	it("shows the current Sunday through Saturday weekly total", async () => {
		window.localStorage.setItem(
			timerEntriesStorageKey,
			JSON.stringify([
				{
					id: "entry-current-sunday",
					day: "2026-06-28",
					seconds: 3600,
					savedAtMs: new Date("2026-06-28T15:00:00.000Z").getTime(),
				},
				{
					id: "entry-current-monday",
					day: "2026-06-29",
					seconds: 1800,
					savedAtMs: new Date("2026-06-29T15:00:00.000Z").getTime(),
				},
				{
					id: "entry-previous-week",
					day: "2026-06-27",
					seconds: 7200,
					savedAtMs: new Date("2026-06-27T15:00:00.000Z").getTime(),
				},
				{
					id: "entry-next-week",
					day: "2026-07-05",
					seconds: 7200,
					savedAtMs: new Date("2026-07-05T15:00:00.000Z").getTime(),
				},
			]),
		);

		render(<TimerTool />);
		await flushEffects();

		expect(
			screen.getByText("Sunday through Saturday, 2026-06-28 to 2026-07-04"),
		).toBeInTheDocument();
		expect(screen.getByText("01:30:00")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Start" }));
		act(() => {
			vi.advanceTimersByTime(30_000);
		});

		expect(screen.getByText("01:30:30")).toBeInTheDocument();
	});

	it("loads a saved running timer and keeps counting", async () => {
		window.localStorage.setItem(
			timerStorageKey,
			JSON.stringify({
				accumulatedSeconds: 60,
				startedAtMs: new Date("2026-06-29T11:59:30.000Z").getTime(),
			}),
		);

		render(<TimerTool />);
		await flushEffects();

		expect(screen.getByTestId("timer-value")).toHaveTextContent("00:01:30");

		act(() => {
			vi.advanceTimersByTime(1_000);
		});

		expect(screen.getByTestId("timer-value")).toHaveTextContent("00:01:31");
	});

	it("adds and removes adjustment minutes from the current state", async () => {
		render(<TimerTool />);
		await flushEffects();

		const value = screen.getByTestId("timer-value");
		const minutesInput = screen.getByLabelText("Adjust current time");

		fireEvent.change(minutesInput, {
			target: {
				value: "10",
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Add minutes" }));

		expect(value).toHaveTextContent("00:10:00");

		fireEvent.change(minutesInput, {
			target: {
				value: "3",
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Remove minutes" }));

		expect(value).toHaveTextContent("00:07:00");
	});

	it("persists stopped timer state until reset", async () => {
		render(<TimerTool />);
		await flushEffects();

		fireEvent.click(screen.getByRole("button", { name: "Start" }));
		act(() => {
			vi.advanceTimersByTime(4_000);
		});
		fireEvent.click(screen.getByRole("button", { name: "Stop" }));
		await flushEffects();

		expect(JSON.parse(window.localStorage.getItem(timerStorageKey) ?? "{}"))
			.toMatchObject({
				accumulatedSeconds: 4,
				startedAtMs: null,
		});

		fireEvent.click(screen.getByRole("button", { name: "Reset" }));
		await flushEffects();

		expect(window.localStorage.getItem(timerStorageKey)).toBe(
			JSON.stringify({
				accumulatedSeconds: 0,
				startedAtMs: null,
			}),
		);
	});
});
