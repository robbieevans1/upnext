"use client";

import { useEffect, useState } from "react";
import { Task } from "@/types/task";

const STORAGE_KEY = "upnext-tasks";
const COMPLETED_KEY = "upnext-completed-today";

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Gym",
    description: "Daily workout",
    isMandatory: true,
    missedCount: 0,
    priority: 10,
    status: "Required daily",
    isActive: true,
  },
  {
    id: "2",
    title: "Portfolio Project",
    description: "Work on UpNext or another project",
    isMandatory: false,
    missedCount: 1,
    priority: 8,
    status: "Moved up because you skipped it yesterday",
    isActive: true,
  },
  {
    id: "3",
    title: "LSAT Study",
    description: "Study one section or review problems",
    isMandatory: false,
    missedCount: 0,
    priority: 7,
    status: "Important today",
    isActive: true,
  },
  {
    id: "4",
    title: "Job Applications",
    description: "Apply to a few relevant roles",
    isMandatory: false,
    missedCount: 0,
    priority: 5,
    status: "Optional after stack",
    isActive: true,
  },
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const savedCompletedTasks = localStorage.getItem(COMPLETED_KEY);

    setTasks(savedTasks ? JSON.parse(savedTasks) : initialTasks);
    setCompletedTasks(
      savedCompletedTasks ? JSON.parse(savedCompletedTasks) : []
    );

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(completedTasks));
  }, [completedTasks, hasLoaded]);

  function addTask(task: Omit<Task, "id" | "missedCount" | "status" | "isActive">) {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: task.title,
      description: task.description,
      isMandatory: task.isMandatory,
      priority: task.priority,
      missedCount: 0,
      status: task.isMandatory ? "Required daily" : "New priority task",
      isActive: true,
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);
  }

  function updateTask(taskId: string, updatedTask: Partial<Task>) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, ...updatedTask } : task
      )
    );
  }

  function deleteTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, isActive: false } : task
      )
    );

    setCompletedTasks((currentCompletedTasks) =>
      currentCompletedTasks.filter((task) => task.id !== taskId)
    );
  }

  function completeTask(taskId: string) {
    const taskToComplete = tasks.find((task) => task.id === taskId);

    if (!taskToComplete) return;

    setCompletedTasks((currentCompletedTasks) => [
      taskToComplete,
      ...currentCompletedTasks,
    ]);

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId)
    );
  }

  function resetDemo() {
    setTasks(initialTasks);
    setCompletedTasks([]);
  }

  return {
    tasks,
    completedTasks,
    hasLoaded,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    resetDemo,
  };
}