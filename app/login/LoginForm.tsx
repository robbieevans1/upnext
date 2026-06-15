"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const accountCreated = searchParams.get("created") === "1";

	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setIsLoading(true);

		const formData = new FormData(event.currentTarget);

		const email = String(formData.get("email") || "");
		const password = String(formData.get("password") || "");

		const result = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});

		setIsLoading(false);

		if (result?.error) {
			setError("Invalid email or password.");
			return;
		}

		router.push("/today");
		router.refresh();
	}

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
			<div>
				<h1 className="text-3xl font-bold text-white">Log in</h1>
				<p className="mt-2 text-sm text-slate-400">
					Continue to your UpNext stack.
				</p>
			</div>

			{accountCreated && (
				<p className="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-300">
					Account created. You can log in now.
				</p>
			)}

			{error && (
				<p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-300">
					{error}
				</p>
			)}

			<div className="space-y-2">
				<label htmlFor="email" className="text-sm font-medium text-slate-200">
					Email
				</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
					placeholder="you@example.com"
				/>
			</div>

			<div className="space-y-2">
				<label
					htmlFor="password"
					className="text-sm font-medium text-slate-200"
				>
					Password
				</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
					placeholder="Your password"
				/>
			</div>

			<button
				type="submit"
				disabled={isLoading}
				className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isLoading ? "Logging in..." : "Log in"}
			</button>

			<p className="text-center text-sm text-slate-400">
				Need an account?{" "}
				<Link href="/signup" className="font-medium text-blue-400">
					Sign up
				</Link>
			</p>
		</form>
	);
}