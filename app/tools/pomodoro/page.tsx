import AppNav from "@/components/AppNav";
import PomodoroTool from "@/components/PomodoroTool";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function PomodoroPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<AppNav />

			<main className="mx-auto max-w-3xl px-6 py-10">
				<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
					Tools
				</p>
				<h1 className="mt-2 text-3xl font-bold text-white">Pomodoro</h1>
				<p className="mt-3 max-w-2xl text-slate-300">
					A focused work timer with short breaks that stay between 5 and 10
					minutes.
				</p>

				<PomodoroTool />
			</main>
		</div>
	);
}
