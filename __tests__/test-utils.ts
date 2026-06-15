export function formDataFrom(
	fields: Record<string, FormDataEntryValue | undefined>,
) {
	const formData = new FormData();

	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined) {
			formData.set(key, value);
		}
	}

	return formData;
}
