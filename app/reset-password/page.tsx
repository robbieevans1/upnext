import ResetPasswordForm from "./ResetPasswordForm";

type ResetPasswordPageProps = {
	searchParams: Promise<{
		token?: string | string[];
	}>;
};

function getToken(token: string | string[] | undefined) {
	return Array.isArray(token) ? token[0] : token;
}

export default async function ResetPasswordPage({
	searchParams,
}: ResetPasswordPageProps) {
	const params = await searchParams;
	const token = getToken(params.token) ?? "";

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
			<ResetPasswordForm token={token} />
		</main>
	);
}
