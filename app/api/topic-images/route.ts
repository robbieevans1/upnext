import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const MAX_TOPIC_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOPIC_IMAGE_UPLOADS = 10;

function getSafeFileName(fileName: string) {
	return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function isUploadedFile(value: FormDataEntryValue): value is File {
	return (
		typeof value === "object" &&
		value !== null &&
		"arrayBuffer" in value &&
		"name" in value &&
		"size" in value &&
		"type" in value
	);
}

export async function POST(request: Request) {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const formData = await request.formData();
	const topicId = String(formData.get("topicId") ?? "");
	const files = formData.getAll("images").filter(isUploadedFile);

	if (!topicId) {
		return Response.json({ error: "Missing topic id" }, { status: 400 });
	}

	if (files.length === 0) {
		return Response.json({ error: "No images selected" }, { status: 400 });
	}

	if (files.length > MAX_TOPIC_IMAGE_UPLOADS) {
		return Response.json(
			{ error: `Upload ${MAX_TOPIC_IMAGE_UPLOADS} images or fewer at a time` },
			{ status: 400 },
		);
	}

	const topic = await prisma.topic.findFirst({
		where: {
			id: topicId,
			userId: session.user.id,
		},
		select: {
			id: true,
		},
	});

	if (!topic) {
		return Response.json({ error: "Topic not found" }, { status: 404 });
	}

	for (const file of files) {
		if (!file.type.startsWith("image/")) {
			return Response.json(
				{ error: "Only image files can be uploaded" },
				{ status: 400 },
			);
		}

		if (file.size > MAX_TOPIC_IMAGE_BYTES) {
			return Response.json(
				{ error: "Images must be 10 MB or smaller" },
				{ status: 400 },
			);
		}
	}

	const imageCount = await prisma.topicImage.count({
		where: {
			topicId,
			userId: session.user.id,
		},
	});

	const uploadedImages = [];

	for (const [index, file] of files.entries()) {
		const blob = await put(
			`topics/${topicId}/${getSafeFileName(file.name || "image")}`,
			file,
			{
				access: "public",
				addRandomSuffix: true,
			},
		);

		const image = await prisma.topicImage.create({
			data: {
				topicId,
				userId: session.user.id,
				url: blob.url,
				pathname: blob.pathname,
				altText: file.name || null,
				sortOrder: imageCount + index,
			},
		});

		uploadedImages.push(image);
	}

	return Response.json({ images: uploadedImages }, { status: 201 });
}
