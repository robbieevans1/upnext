import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTasks } from "@/hooks/useTask";

describe("useTasks", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
		vi.stubGlobal("crypto", {
			randomUUID: vi
				.fn()
				.mockReturnValueOnce("group-new")
				.mockReturnValueOnce("task-new")
				.mockReturnValue("id-new"),
		});
	});

	it("loads default demo tasks and groups when storage is empty", async () => {
		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.hasLoaded).toBe(true));

		expect(result.current.groups.map((group) => group.name)).toEqual([
			"Career",
			"LSAT",
		]);
		expect(result.current.remainingTasks).toHaveLength(6);
		expect(result.current.completedTodayTasks).toHaveLength(0);
	});

	it("adds groups and tasks at the bottom of their active stack", async () => {
		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.hasLoaded).toBe(true));

		act(() => {
			result.current.addGroup({
				name: "Health",
				description: "Keep the machine running",
			});
		});
		act(() => {
			result.current.addTask({
				title: "Meditate",
				description: "Ten minutes",
				isMandatory: false,
				groupId: "career",
			});
		});

		expect(result.current.groups).toContainEqual({
			id: "group-new",
			name: "Health",
			description: "Keep the machine running",
			isActive: true,
		});
		expect(result.current.tasks).toContainEqual(
			expect.objectContaining({
				id: "task-new",
				title: "Meditate",
				groupId: "career",
				stackOrder: 3,
				status: "Group stack",
			}),
		);
	});

	it("completes a grouped task once today and rotates it to the bottom", async () => {
		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.hasLoaded).toBe(true));

		act(() => {
			result.current.completeTask("2");
			result.current.completeTask("2");
		});

		expect(result.current.completedTodayIds).toEqual(["2"]);
		expect(result.current.completedTodayTasks).toHaveLength(1);
		expect(result.current.remainingTasks.map((task) => task.id)).not.toContain(
			"2",
		);
		expect(
			result.current.tasks
				.filter((task) => task.groupId === "career")
				.sort((a, b) => a.stackOrder - b.stackOrder)
				.map((task) => task.id),
		).toEqual(["3", "4", "2"]);
	});

	it("soft deletes groups, their tasks, and matching completions", async () => {
		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.hasLoaded).toBe(true));

		act(() => {
			result.current.completeTask("2");
			result.current.deleteGroup("career");
		});

		expect(result.current.groups.find((group) => group.id === "career")).toEqual(
			expect.objectContaining({ isActive: false }),
		);
		expect(
			result.current.tasks.filter((task) => task.groupId === "career"),
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: "2", isActive: false }),
				expect.objectContaining({ id: "3", isActive: false }),
				expect.objectContaining({ id: "4", isActive: false }),
			]),
		);
		expect(result.current.completedTodayIds).toEqual([]);
	});

	it("clears only today's completions", async () => {
		localStorage.setItem(
			"upnext-completed-today",
			JSON.stringify([
				{ taskId: "2", completedOn: "2026-06-15" },
				{ taskId: "3", completedOn: "2026-06-14" },
			]),
		);
		const { result } = renderHook(() => useTasks());

		await waitFor(() => expect(result.current.hasLoaded).toBe(true));

		act(() => {
			result.current.clearTodayCompletedTasks();
		});

		expect(result.current.completedTodayIds).toEqual([]);
		expect(
			JSON.parse(localStorage.getItem("upnext-completed-today") ?? "[]"),
		).toEqual([{ taskId: "3", completedOn: "2026-06-14" }]);
	});
});
