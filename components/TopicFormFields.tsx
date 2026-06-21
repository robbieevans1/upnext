export function TopicFormFields({
	title,
	category,
	description,
	body,
	notesSize = "standard",
}: {
	title?: string;
	category?: string | null;
	description?: string | null;
	body?: string | null;
	notesSize?: "standard" | "large";
}) {
	return (
		<div className="space-y-4">
			<TextInput
				label="Title"
				name="title"
				placeholder="Networking events"
				defaultValue={title ?? ""}
			/>
			<TextInput
				label="Category"
				name="category"
				placeholder="Social, Career, Health"
				defaultValue={category ?? ""}
			/>
			<TextArea
				label="Description"
				name="description"
				placeholder="Short summary or when to use this topic"
				defaultValue={description ?? ""}
			/>
			<TextArea
				label="Notes"
				name="body"
				placeholder="Steps, reminders, current work, principles, or things to reread."
				defaultValue={body ?? ""}
				size={notesSize}
			/>
		</div>
	);
}

function TextInput({
	label,
	name,
	placeholder,
	defaultValue,
}: {
	label: string;
	name: string;
	placeholder?: string;
	defaultValue?: string;
}) {
	return (
		<div>
			<label className="text-sm font-medium text-slate-300">{label}</label>
			<input
				name={name}
				placeholder={placeholder}
				defaultValue={defaultValue}
				className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
			/>
		</div>
	);
}

function TextArea({
	label,
	name,
	placeholder,
	defaultValue,
	size = "standard",
}: {
	label: string;
	name: string;
	placeholder?: string;
	defaultValue?: string;
	size?: "standard" | "large";
}) {
	const sizeClass =
		size === "large" ? "min-h-[60vh] text-base leading-7" : "min-h-40";

	return (
		<div>
			<label className="text-sm font-medium text-slate-300">{label}</label>
			<textarea
				name={name}
				placeholder={placeholder}
				defaultValue={defaultValue}
				className={`mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500 ${sizeClass}`}
			/>
		</div>
	);
}
