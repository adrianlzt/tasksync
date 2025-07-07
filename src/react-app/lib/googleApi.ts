import { TaskList, Task } from '@/shared/types';

const API_BASE_URL = 'https://tasks.googleapis.com/tasks/v1';

export async function getTaskLists(accessToken: string): Promise<TaskList[]> {
  const response = await fetch(`${API_BASE_URL}/users/@me/lists`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch task lists');
  }

  const data = await response.json();
  return data.items || [];
}

export async function getTasks(accessToken: string, taskListId: string): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/lists/${taskListId}/tasks`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks for list ${taskListId}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function deleteTask(accessToken: string, taskListId: string, taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete task ${taskId}`);
  }
}
