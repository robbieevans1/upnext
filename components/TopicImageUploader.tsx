"use client";

import { useRef, useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";

type TopicImageUploaderProps = {
	topicId: string;
};

function getImageFiles(fileList: FileList | File[]) {
	return Array.from(fileList).filter((file) => file.type.startsWith("image/"));
}

export default function TopicImageUploader({ topicId }: TopicImageUploaderProps) {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	async function uploadImages(files: File[]) {
		if (files.length === 0) {
			setMessage("Choose or paste an image to upload.");
			return;
		}

		const formData = new FormData();
		formData.append("topicId", topicId);

		for (const file of files) {
			formData.append("images", file);
		}

		setMessage("Uploading images...");

		const response = await fetch("/api/topic-images", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			setMessage(payload?.error ?? "Images could not be uploaded.");
			return;
		}

		setMessage("Images added.");
		fileInputRef.current?.form?.reset();
		router.refresh();
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = event.currentTarget.files;

		if (!files) return;

		startTransition(async () => {
			await uploadImages(getImageFiles(files));
		});
	}

	function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
		const files = getImageFiles(event.clipboardData.files);

		if (files.length === 0) return;

		event.preventDefault();
		startTransition(async () => {
			await uploadImages(files);
		});
	}

	return (
		<div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-xl font-bold text-white">Images</h2>
					<p className="mt-1 text-sm text-slate-400">
						Add images over time or paste screenshots into the drop zone.
					</p>
				</div>

				<form className="shrink-0">
					<label className="inline-flex cursor-pointer rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
						Add Images
						<input
							ref={fileInputRef}
							type="file"
							name="images"
							accept="image/*"
							multiple
							onChange={handleFileChange}
							disabled={isPending}
							className="sr-only"
						/>
					</label>
				</form>
			</div>

			<div
				onPaste={handlePaste}
				tabIndex={0}
				className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-6 text-center text-sm text-slate-400 outline-none focus:border-sky-400 focus:text-slate-200"
			>
				Paste images here
			</div>

			{message && (
				<p className="mt-3 text-sm text-slate-400" role="status">
					{message}
				</p>
			)}
		</div>
	);
}
