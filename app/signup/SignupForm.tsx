"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "./actions";

const initialState = {
	error: "",
};

export default function SignupForm() {
	const [state, formAction, isPending] = useActionState(
		signUpAction,
		initialState
	);

	return (
		<form action={formAction} className="w-full max-w-md space-y-5">
			<div>
				<h1 className="text-3xl font-bold text-white">Create your account</h1>
				<p className="mt-2 text-sm text-slate-400">
					Start organizing your next task stack.
				</p>
			</div>

			{state.error && (
				<p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-300">
					{state.error}
				</p>
			)}

			<div className="space-y-2">
				<label htmlFor="name" className="text-sm font-medium text-slate-200">
					Name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
					placeholder="Robert"
				/>
			</div>

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
					minLength={8}
					className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
					placeholder="At least 8 characters"
				/>
			</div>

			<button
				type="submit"
				disabled={isPending}
				className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isPending ? "Creating account..." : "Sign up"}
			</button>

			<p className="text-center text-sm text-slate-400">
				Already have an account?{" "}
				<Link href="/login" className="font-medium text-blue-400">
					Log in
				</Link>
			</p>
		</form>
	);
}