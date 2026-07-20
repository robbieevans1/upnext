"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

const initialState = {
	error: "",
	message: "",
};

export default function ForgotPasswordForm() {
	const [state, formAction, isPending] = useActionState(
		requestPasswordReset,
		initialState,
	);

	return (
		<form action={formAction} className="w-full max-w-md space-y-5">
			<div>
				<h1 className="text-3xl font-bold text-white">Reset password</h1>
				<p className="mt-2 text-sm text-slate-400">
					Enter your email and UpNext will send a reset link if the account
					exists.
				</p>
			</div>

			{state.error && (
				<p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-300">
					{state.error}
				</p>
			)}

			{state.message && (
				<p className="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-300">
					{state.message}
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

			<button
				type="submit"
				disabled={isPending}
				className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isPending ? "Sending reset link..." : "Send reset link"}
			</button>

			<p className="text-center text-sm text-slate-400">
				Remembered it?{" "}
				<Link href="/login" className="font-medium text-blue-400">
					Log in
				</Link>
			</p>
		</form>
	);
}
