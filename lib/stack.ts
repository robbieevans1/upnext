import { Task } from "@/types/task";

export function sortStack(taskList: Task[]) {
	return [...taskList]
		.filter((task) => task.isActive)
		.sort((a, b) => {
			if (a.isMandatory !== b.isMandatory) {
				return Number(b.isMandatory) - Number(a.isMandatory);
			}

			if (a.missedCount !== b.missedCount) {
				return b.missedCount - a.missedCount;
			}

			return a.stackOrder - b.stackOrder;
		});
}

export function sortGroupStack(taskList: Task[], groupId: string) {
	return [...taskList]
		.filter((task) => task.isActive && task.groupId === groupId)
		.sort((a, b) => a.stackOrder - b.stackOrder);
}
