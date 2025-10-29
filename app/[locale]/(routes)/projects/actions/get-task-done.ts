import axios from "axios";

//Actions
export const getTaskDone = async (taskId: string) => {
  try {
    await axios.post(`/api/projects/tasks/mark-task-as-done/${taskId}`);
  } catch (error) {
    // Silently handle error; callers should present user feedback
  }
};
