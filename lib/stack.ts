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

      return b.priority - a.priority;
    });
}