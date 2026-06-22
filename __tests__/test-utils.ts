export function formDataFrom(
	fields: Record<
		string,
		FormDataEntryValue | FormDataEntryValue[] | undefined
	>,
) {
	const formData = new FormData();

	for (const [key, value] of Object.entries(fields)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				formData.append(key, item);
			}
		} else if (value !== undefined) {
			formData.set(key, value);
		}
	}

	return formData;
}
