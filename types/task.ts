export type TaskGroup = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  isMandatory: boolean;
  missedCount: number;
  status: string;
  isActive: boolean;

  groupId?: string;
  stackOrder: number;
};