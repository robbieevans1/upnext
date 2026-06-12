"use client";

import { useEffect, useState } from "react";
import { CompletedTask, Task, TaskGroup } from "@/types/task";

const TASKS_STORAGE_KEY = "upnext-tasks";
const GROUPS_STORAGE_KEY = "upnext-task-groups";
const COMPLETED_KEY = "upnext-completed-today";

function getTodayKey() {
	return new Date().toISOString().split("T")[0];
}

const initialGroups: TaskGroup[] = [
	{
		id: "career",
		name: "Career",
		description: "Tasks that move your software career forward",
		isActive: true,
	},
	{
		id: "lsat",
		name: "LSAT",
		description: "Study tasks for LSAT prep",
		isActive: true,
	},
];

const initialTasks: Task[] = [
	{
		id: "1",
		title: "Gym",
		description: "Daily workout",
		isMandatory: true,
		missedCount: 0,
		status: "Required daily",
		isActive: true,
		stackOrder: 0,
	},
	{
		id: "2",
		title: "Portfolio Project",
		description: "Work on UpNext or another project",
		isMandatory: false,
		missedCount: 0,
		status: "Career stack",
		isActive: true,
		groupId: "career",
		stackOrder: 0,
	},
	{
		id: "3",
		title: "LeetCode Question",
		description: "Solve or review one coding problem",
		isMandatory: false,
		missedCount: 0,
		status: "Career stack",
		isActive: true,
		groupId: "career",
		stackOrder: 1,
	},
	{
		id: "4",
		title: "Job Applications",
		description: "Apply to a few relevant roles",
		isMandatory: false,
		missedCount: 0,
		status: "Career stack",
		isActive: true,
		groupId: "career",
		stackOrder: 2,
	},
	{
		id: "5",
		title: "Logical Reasoning",
		description: "Complete one LSAT logical reasoning drill",
		isMandatory: false,
		missedCount: 0,
		status: "LSAT stack",
		isActive: true,
		groupId: "lsat",
		stackOrder: 0,
	},
	{
		id: "6",
		title: "Reading Comprehension",
		description: "Complete one LSAT reading comp passage",
		isMandatory: false,
		missedCount: 0,
		status: "LSAT stack",
		isActive: true,
		groupId: "lsat",
		stackOrder: 1,
	},
];

export function useTasks() {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [groups, setGroups] = useState<TaskGroup[]>([]);
	const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
	const [hasLoaded, setHasLoaded] = useState(false);

	const todayKey = getTodayKey();

	useEffect(() => {
		const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
		const savedGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
		const savedCompletedTasks = localStorage.getItem(COMPLETED_KEY);

		setTasks(savedTasks ? JSON.parse(savedTasks) : initialTasks);
		setGroups(savedGroups ? JSON.parse(savedGroups) : initialGroups);
		setCompletedTasks(
			savedCompletedTasks ? JSON.parse(savedCompletedTasks) : [],
		);

		setHasLoaded(true);
	}, []);

	useEffect(() => {
		if (!hasLoaded) return;
		localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
	}, [tasks, hasLoaded]);

	useEffect(() => {
		if (!hasLoaded) return;
		localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
	}, [groups, hasLoaded]);

	useEffect(() => {
		if (!hasLoaded) return;
		localStorage.setItem(COMPLETED_KEY, JSON.stringify(completedTasks));
	}, [completedTasks, hasLoaded]);

	const completedTodayIds = completedTasks
		.filter((completedTask) => completedTask.completedOn === todayKey)
		.map((completedTask) => completedTask.taskId);

	const completedTodayTasks = tasks.filter(
		(task) => task.isActive && completedTodayIds.includes(task.id),
	);

	const remainingTasks = tasks.filter(
		(task) => task.isActive && !completedTodayIds.includes(task.id),
	);

	function addGroup(group: Omit<TaskGroup, "id" | "isActive">) {
		const newGroup: TaskGroup = {
			id: crypto.randomUUID(),
			name: group.name,
			description: group.description,
			isActive: true,
		};

		setGroups((currentGroups) => [...currentGroups, newGroup]);
	}

	function updateGroup(groupId: string, updatedGroup: Partial<TaskGroup>) {
		setGroups((currentGroups) =>
			currentGroups.map((group) =>
				group.id === groupId ? { ...group, ...updatedGroup } : group,
			),
		);
	}

	function deleteGroup(groupId: string) {
		const taskIdsInGroup = tasks
			.filter((task) => task.groupId === groupId)
			.map((task) => task.id);

		setGroups((currentGroups) =>
			currentGroups.map((group) =>
				group.id === groupId ? { ...group, isActive: false } : group,
			),
		);

		setTasks((currentTasks) =>
			currentTasks.map((task) =>
				task.groupId === groupId ? { ...task, isActive: false } : task,
			),
		);

		setCompletedTasks((currentCompletedTasks) =>
			currentCompletedTasks.filter(
				(completedTask) => !taskIdsInGroup.includes(completedTask.taskId),
			),
		);
	}

	function addTask(
		task: Omit<
			Task,
			"id" | "missedCount" | "status" | "isActive" | "stackOrder"
		>,
	) {
		const groupTasks = task.groupId
			? tasks.filter(
					(currentTask) =>
						currentTask.groupId === task.groupId && currentTask.isActive,
				)
			: tasks.filter(
					(currentTask) => !currentTask.groupId && currentTask.isActive,
				);

		const newTask: Task = {
			id: crypto.randomUUID(),
			title: task.title,
			description: task.description,
			isMandatory: task.isMandatory,
			groupId: task.groupId || undefined,
			missedCount: 0,
			status: task.isMandatory ? "Required daily" : "Group stack",
			isActive: true,
			stackOrder: groupTasks.length,
		};

		setTasks((currentTasks) => [...currentTasks, newTask]);
	}

	function updateTask(taskId: string, updatedTask: Partial<Task>) {
		setTasks((currentTasks) =>
			currentTasks.map((task) =>
				task.id === taskId ? { ...task, ...updatedTask } : task,
			),
		);
	}

	function deleteTask(taskId: string) {
		setTasks((currentTasks) =>
			currentTasks.map((task) =>
				task.id === taskId ? { ...task, isActive: false } : task,
			),
		);

		setCompletedTasks((currentCompletedTasks) =>
			currentCompletedTasks.filter(
				(completedTask) => completedTask.taskId !== taskId,
			),
		);
	}

	function completeTask(taskId: string) {
		const taskToComplete = tasks.find((task) => task.id === taskId);

		if (!taskToComplete) return;

		const alreadyCompletedToday = completedTasks.some(
			(completedTask) =>
				completedTask.taskId === taskId &&
				completedTask.completedOn === todayKey,
		);

		if (alreadyCompletedToday) return;

		setCompletedTasks((currentCompletedTasks) => [
			{
				taskId,
				completedOn: todayKey,
			},
			...currentCompletedTasks,
		]);

		if (!taskToComplete.groupId) return;

		setTasks((currentTasks) => {
			const activeGroupTasks = currentTasks
				.filter(
					(task) =>
						task.groupId === taskToComplete.groupId &&
						task.isActive &&
						task.id !== taskId,
				)
				.sort((a, b) => a.stackOrder - b.stackOrder);

			const movedTask: Task = {
				...taskToComplete,
				stackOrder: activeGroupTasks.length,
			};

			const reorderedGroupTasks = [
				...activeGroupTasks.map((task, index) => ({
					...task,
					stackOrder: index,
				})),
				movedTask,
			];

			return currentTasks.map((task) => {
				const reorderedTask = reorderedGroupTasks.find(
					(groupTask) => groupTask.id === task.id,
				);

				return reorderedTask ?? task;
			});
		});
	}

	function resetDemo() {
		setTasks(initialTasks);
		setGroups(initialGroups);
		setCompletedTasks([]);
	}

	function clearTodayCompletedTasks() {
		setCompletedTasks((currentCompletedTasks) =>
			currentCompletedTasks.filter(
				(completedTask) => completedTask.completedOn !== todayKey,
			),
		);
	}

	return {
		tasks,
		groups,
		remainingTasks,
		completedTodayTasks,
		completedTodayIds,
		hasLoaded,
		addGroup,
		updateGroup,
		deleteGroup,
		addTask,
		updateTask,
		deleteTask,
		completeTask,
		resetDemo,
		clearTodayCompletedTasks,
	};
}
