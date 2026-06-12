"use client";

import AppNav from "@/components/AppNav";
import {useTasks} from "@/hooks/useTask";
import { sortStack, sortGroupStack } from "@/lib/stack";
import { Task } from "@/types/task";

export default function Home() {
  const {
    groups,
    remainingTasks,
    completedTodayTasks,
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

  const activeGroups = groups.filter((group) => group.isActive);

  const mandatoryTasks = sortStack(
    remainingTasks.filter((task) => task.isMandatory)
  );

  const ungroupedTasks = sortStack(
    remainingTasks.filter((task) => !task.isMandatory && !task.groupId)
  );

  const groupedTasks = activeGroups
    .map((group) => {
      const tasks = sortGroupStack(remainingTasks, group.id);

      return {
        group,
        tasks,
      };
    })
    .filter((groupStack) => groupStack.tasks.length > 0);

  const totalRemainingTasks = remainingTasks.length;
  const totalCompletedTasks = completedTodayTasks.length;
  const totalTasksToday = totalRemainingTasks + totalCompletedTasks;

  const progressPercent =
    totalTasksToday === 0
      ? 0
      : Math.round((totalCompletedTasks / totalTasksToday) * 100);

  const currentTask =
    mandatoryTasks[0] ??
    groupedTasks[0]?.tasks[0] ??
    ungroupedTasks[0] ??
    null;

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
                Mandatory tasks stay first. Group tasks rotate after completion
                and return tomorrow at the bottom of their stack.
              </p>
            </div>

            <button
              onClick={resetDemo}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-sky-500 hover:text-sky-400"
            >
              Reset
            </button>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
              <span>{totalCompletedTasks} completed</span>
              <span>{totalRemainingTasks} remaining</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {progressPercent}% done today
            </p>
          </div>

          {currentTask ? (
            <CurrentTaskCard task={currentTask} onComplete={completeTask} />
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

          {mandatoryTasks.length > 0 && (
            <StackSection title="Mandatory">
              {mandatoryTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  badge="Required"
                />
              ))}
            </StackSection>
          )}

          {groupedTasks.map(({ group, tasks }) => (
            <StackSection key={group.id} title={group.name}>
              {group.description && (
                <p className="mb-3 text-sm text-slate-500">
                  {group.description}
                </p>
              )}

              {tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  badge={index === 0 ? "Up next" : "In stack"}
                />
              ))}
            </StackSection>
          ))}

          {ungroupedTasks.length > 0 && (
            <StackSection title="Ungrouped">
              {ungroupedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  badge="Single task"
                />
              ))}
            </StackSection>
          )}

          {completedTodayTasks.length > 0 && (
            <div className="mt-10 border-t border-slate-800 pt-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-200">
                Completed Today
              </h3>

              <div className="space-y-3">
                {completedTodayTasks.map((task) => {
                  const group = activeGroups.find(
                    (group) => group.id === task.groupId
                  );

                  return (
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
                            {group ? ` · ${group.name}` : ""}
                          </p>
                        </div>

                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                          Done
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function CurrentTaskCard({
  task,
  onComplete,
}: {
  task: Task;
  onComplete: (taskId: string) => void;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-sky-500/40 bg-slate-900 p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
            Current Priority
          </p>

          <h2 className="mt-3 text-3xl font-bold">{task.title}</h2>

          <p className="mt-2 text-slate-300">{task.status}</p>
        </div>

        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
          Recommended
        </span>
      </div>

      <button
        onClick={() => onComplete(task.id)}
        className="mt-6 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
      >
        Complete
      </button>
    </div>
  );
}

function StackSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h3 className="mb-4 text-lg font-semibold text-slate-200">{title}</h3>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TaskRow({
  task,
  badge,
  onComplete,
}: {
  task: Task;
  badge: string;
  onComplete: (taskId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold">{task.title}</h4>

          {task.description && (
            <p className="mt-1 text-sm text-slate-400">{task.description}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {badge}
            </span>

            {task.isMandatory && (
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
                Mandatory
              </span>
            )}

            {!task.isMandatory && task.groupId && (
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
                Rotating
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onComplete(task.id)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400"
        >
          Complete
        </button>
      </div>
    </div>
  );
}