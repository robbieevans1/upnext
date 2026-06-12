"use client";

import AppNav from "@/components/AppNav";
import { useTasks } from "@/hooks/useTask";
import { sortStack } from "@/lib/stack";

export default function Home() {
  const {
    tasks,
    completedTasks,
    hasLoaded,
    completeTask,
    resetDemo,
  } = useTasks();

  if (!hasLoaded) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        Loading...
      </main>
    );
  }

  const stack = sortStack(tasks);
  const currentTask = stack[0];
  const upcomingTasks = stack.slice(1);

  return (
    <>
      <AppNav />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-sky-400">UpNext</p>

              <h1 className="text-4xl font-bold tracking-tight">
                Today&apos;s Stack
              </h1>

              <p className="mt-3 text-slate-400">
                Start with the top recommendation, or complete any task when it
                fits your day.
              </p>
            </div>

            <button
              onClick={resetDemo}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-sky-500 hover:text-sky-400"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3 text-sm text-slate-400">
            <span>{completedTasks.length} completed</span>
            <span>•</span>
            <span>{stack.length} remaining</span>
          </div>

          {currentTask ? (
            <div className="mt-8 rounded-2xl border border-sky-500/40 bg-slate-900 p-6 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
                    Current Priority
                  </p>

                  <h2 className="mt-3 text-3xl font-bold">
                    {currentTask.title}
                  </h2>

                  <p className="mt-2 text-slate-300">{currentTask.status}</p>
                </div>

                <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
                  Recommended
                </span>
              </div>

              <button
                onClick={() => completeTask(currentTask.id)}
                className="mt-6 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
              >
                Complete
              </button>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
                Stack Clear
              </p>

              <h2 className="mt-3 text-3xl font-bold">Nice work.</h2>

              <p className="mt-2 text-emerald-100/80">
                You completed everything in today&apos;s stack.
              </p>
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold text-slate-200">
                Coming Up
              </h3>

              <div className="space-y-3">
                {upcomingTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">#{index + 2}</p>

                        <h4 className="text-lg font-semibold">{task.title}</h4>

                        <p className="mt-1 text-sm text-slate-400">
                          {task.status}
                        </p>

                        <div className="mt-3 flex gap-2">
                          {task.isMandatory && (
                            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
                              Required
                            </span>
                          )}

                          {!task.isMandatory && task.missedCount > 0 && (
                            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                              Moved Up
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => completeTask(task.id)}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="mt-10 border-t border-slate-800 pt-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-200">
                Completed Today
              </h3>

              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-emerald-100">
                          {task.title}
                        </h4>

                        <p className="mt-1 text-sm text-emerald-200/70">
                          Completed today
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        Done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}