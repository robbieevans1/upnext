type PasswordResetEmailInput = {
	to: string;
	resetUrl: string;
};

type ResendResponse = {
	error?: {
		message?: string;
	};
};

export async function sendPasswordResetEmail({
	to,
	resetUrl,
}: PasswordResetEmailInput) {
	const resendApiKey = process.env.RESEND_API_KEY;
	const fromEmail = process.env.PASSWORD_RESET_EMAIL_FROM;

	if (!resendApiKey || !fromEmail) {
		if (process.env.NODE_ENV !== "production") {
			console.info(`Password reset link for ${to}: ${resetUrl}`);
			return;
		}

		throw new Error("Password reset email is not configured.");
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${resendApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: fromEmail,
			to,
			subject: "Reset your UpNext password",
			text: [
				"Use the link below to reset your UpNext password.",
				"",
				resetUrl,
				"",
				"This link expires in 60 minutes. If you did not request it, you can ignore this email.",
			].join("\n"),
		}),
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as ResendResponse | null;
		throw new Error(
			body?.error?.message || "Password reset email could not be sent.",
		);
	}
}
