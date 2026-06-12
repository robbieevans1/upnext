import AppNav from "@/components/AppNav";
import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      <AppNav />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto max-w-3xl">
          <p className="mb-2 text-sm font-medium text-sky-400">About UpNext</p>

          <h1 className="text-4xl font-bold tracking-tight">
            A task app built around what you should do next.
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-300">
            UpNext is a productivity app that organizes recurring tasks into a
            daily stack. Instead of showing every task as equally important,
            UpNext helps you focus on the next best task to complete.
          </p>

          <div className="mt-10 grid gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Mandatory tasks stay first</h2>

              <p className="mt-3 leading-7 text-slate-400">
                Some tasks matter every day, like going to the gym, studying, or
                completing a required habit. UpNext keeps mandatory tasks near
                the top of your stack until they are completed.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Task groups rotate</h2>

              <p className="mt-3 leading-7 text-slate-400">
                Related tasks can be placed into groups, such as Career, LSAT,
                or Health. When you complete a task inside a group, it moves
                into Completed Today and returns tomorrow at the bottom of that
                group&apos;s stack.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Progress is tracked daily</h2>

              <p className="mt-3 leading-7 text-slate-400">
                UpNext stores task completions by date, which makes it possible
                to build analytics around consistency, streaks, skipped tasks,
                and progress across different areas of life.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-bold">Built for realistic days</h2>

              <p className="mt-3 leading-7 text-slate-400">
                The stack gives you a recommended order, but it does not force
                you to complete tasks in that order. You can complete any task
                when it fits your day.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
            <h2 className="text-xl font-bold">The goal</h2>

            <p className="mt-3 leading-7 text-slate-300">
              UpNext is designed to reduce avoidance. It helps users rotate
              through important recurring tasks instead of repeatedly choosing
              only the easiest work.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400"
              >
                View Today&apos;s Stack
              </Link>

              <Link
                href="/tasks"
                className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:border-sky-500 hover:text-sky-400"
              >
                Manage Tasks
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}