"use server";

import {
	createPasswordResetToken,
	getPasswordResetExpiresAt,
	getPasswordResetUrl,
	hashPasswordResetToken,
	PASSWORD_RESET_SUCCESS_MESSAGE,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

type ForgotPasswordState = {
	error?: string;
	message?: string;
};

export async function requestPasswordReset(
	_prevState: ForgotPasswordState,
	formData: FormData,
): Promise<ForgotPasswordState> {
	const email = String(formData.get("email") || "").toLowerCase().trim();

	if (!email || !email.includes("@")) {
		return {
			error: "Enter a valid email.",
		};
	}

	const user = await prisma.user.findUnique({
		where: {
			email,
		},
		select: {
			id: true,
			email: true,
		},
	});

	if (!user) {
		return {
			message: PASSWORD_RESET_SUCCESS_MESSAGE,
		};
	}

	const token = createPasswordResetToken();
	const tokenHash = hashPasswordResetToken(token);
	const expiresAt = getPasswordResetExpiresAt();
	const resetUrl = getPasswordResetUrl(token);
	const usedAt = new Date();

	await prisma.$transaction([
		prisma.passwordResetToken.updateMany({
			where: {
				userId: user.id,
				usedAt: null,
			},
			data: {
				usedAt,
			},
		}),
		prisma.passwordResetToken.create({
			data: {
				userId: user.id,
				tokenHash,
				expiresAt,
			},
		}),
	]);

	await sendPasswordResetEmail({
		to: user.email,
		resetUrl,
	});

	return {
		message: PASSWORD_RESET_SUCCESS_MESSAGE,
	};
}
