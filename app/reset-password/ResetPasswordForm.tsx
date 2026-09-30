"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "./actions";

const initialState = {
	error: "",
};

export default function ResetPasswordForm({ token }: { token: string }) {
	const [state, formAction, isPending] = useActionState(
		resetPassword,
		initialState,
	);

	return (
		<form action={formAction} className="w-full max-w-md space-y-5">
			<input type="hidden" name="token" value={token} />

			<div>
				<h1 className="text-3xl font-bold text-white">Choose a new password</h1>
				<p className="mt-2 text-sm text-slate-400">
					Use at least 8 characters. Reset links expire after 60 minutes.
				</p>
			</div>

			{state.error && (
				<p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-300">
					{state.error}
				</p>
			)}

			<div className="space-y-2">
				<label
					htmlFor="password"
					className="text-sm font-medium text-slate-200"
				>
					New password
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
				disabled={isPending || !token}
				className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{isPending ? "Resetting password..." : "Reset password"}
			</button>

			<p className="text-center text-sm text-slate-400">
				Need a new link?{" "}
				<Link href="/forgot-password" className="font-medium text-blue-400">
					Request another reset
				</Link>
			</p>
		</form>
	);
}
