import { TaskList, Task, KeepNote } from '@/shared/types';

const API_BASE_URL = 'https://tasks.googleapis.com/tasks/v1';
const KEEP_API_BASE_URL = 'https://keep.googleapis.com/v1';

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

export async function updateTask(accessToken: string, taskListId: string, taskId: string, taskData: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });

  if (!response.ok) {
    throw new Error(`Failed to update task ${taskId}`);
  }

  return response.json();
}

export async function getKeepNotes(accessToken: string): Promise<KeepNote[]> {
  const response = await fetch(`${KEEP_API_BASE_URL}/notes`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let message = `Failed to fetch Google Keep notes (status: ${response.status})`;
    try {
      const error = await response.json();
      if (error?.error?.message) {
        message = error.error.message;
      }
    } catch (e) {
      // ignore if response body is not json
    }
    console.error(`Failed to fetch Google Keep notes: ${message}`);
    throw new Error(message);
  }

  const data = await response.json();
  return data.notes || [];
}
