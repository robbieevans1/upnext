"use client";

import { FormEvent, useState } from "react";
import AppNav from "@/components/AppNav";
import { useTasks } from "@/hooks/useTask";
import { Task } from "@/types/task";

export default function TasksPage() {
  const {
    tasks,
    hasLoaded,
    addTask,
    updateTask,
    deleteTask,
  } = useTasks();

  const activeTasks = tasks.filter((task) => task.isActive);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [priority, setPriority] = useState(5);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingIsMandatory, setEditingIsMandatory] = useState(false);
  const [editingPriority, setEditingPriority] = useState(5);

  if (!hasLoaded) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Loading...
      </main>
    );
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) return;

    addTask({
      title,
      description,
      isMandatory,
      priority,
    });

    setTitle("");
    setDescription("");
    setIsMandatory(false);
    setPriority(5);
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? "");
    setEditingIsMandatory(task.isMandatory);
    setEditingPriority(task.priority);
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingDescription("");
    setEditingIsMandatory(false);
    setEditingPriority(5);
  }

  function saveEditing(taskId: string) {
    if (!editingTitle.trim()) return;

    updateTask(taskId, {
      title: editingTitle,
      description: editingDescription,
      isMandatory: editingIsMandatory,
      priority: editingPriority,
      status: editingIsMandatory ? "Required daily" : "Priority task",
    });

    cancelEditing();
  }

  return (
    <>
      <AppNav />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-2xl">
          <p className="mb-2 text-sm font-medium text-sky-400">Manage</p>

          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>

          <p className="mt-3 text-slate-400">
            Add, edit, or remove tasks from your daily priority stack.
          </p>

          <form
            onSubmit={handleAddTask}
            className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
          >
            <h2 className="text-xl font-bold">Add Task</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Task name
                </label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Portfolio Project"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Work on the app for at least 30 minutes"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300">
                  Priority: {priority}
                </label>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(event) => setPriority(Number(event.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(event) => setIsMandatory(event.target.checked)}
                />
                Mandatory daily task
              </label>

              <button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
                Add Task
              </button>
            </div>
          </form>

          <div className="mt-10">
            <h2 className="mb-4 text-xl font-bold">Active Tasks</h2>

            <div className="space-y-3">
              {activeTasks.map((task) => {
                const isEditing = editingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <input
                          value={editingTitle}
                          onChange={(event) =>
                            setEditingTitle(event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                        />

                        <textarea
                          value={editingDescription}
                          onChange={(event) =>
                            setEditingDescription(event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
                        />

                        <div>
                          <label className="text-sm font-medium text-slate-300">
                            Priority: {editingPriority}
                          </label>

                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={editingPriority}
                            onChange={(event) =>
                              setEditingPriority(Number(event.target.value))
                            }
                            className="mt-2 w-full"
                          />
                        </div>

                        <label className="flex items-center gap-3 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={editingIsMandatory}
                            onChange={(event) =>
                              setEditingIsMandatory(event.target.checked)
                            }
                          />
                          Mandatory daily task
                        </label>

                        <div className="flex gap-3">
                          <button
                            onClick={() => saveEditing(task.id)}
                            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                          >
                            Save
                          </button>

                          <button
                            onClick={cancelEditing}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-sky-500 hover:text-sky-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="mt-1 text-sm text-slate-400">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                              Priority {task.priority}
                            </span>

                            {task.isMandatory && (
                              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
                                Mandatory
                              </span>
                            )}

                            {!task.isMandatory && (
                              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                                Rotating
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditing(task)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-sky-500 hover:text-sky-400"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}