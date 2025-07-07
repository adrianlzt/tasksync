import { useState, useCallback } from 'react';
import { Task, TaskList, KeepNote, SearchRequest, ChatRequest, ChatMessage } from '@/shared/types';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T>(
    url: string,
    options?: RequestInit
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Important for cookies
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // OAuth functions
  const checkGoogleOAuthStatus = useCallback(async (): Promise<{ connected: boolean; scopes: string[] }> => {
    return apiCall<{ connected: boolean; scopes: string[] }>('/api/oauth/google/status');
  }, [apiCall]);

  const requestGoogleOAuth = useCallback(async (): Promise<{ authUrl: string }> => {
    return apiCall<{ authUrl: string }>('/api/oauth/google/request', {
      method: 'POST',
    });
  }, [apiCall]);

  // Tasks
  const getTasks = useCallback(async (listId?: string): Promise<Task[]> => {
    const url = listId ? `/api/tasks?list_id=${listId}` : '/api/tasks';
    return apiCall<Task[]>(url);
  }, [apiCall]);

  const getTaskLists = useCallback(async (): Promise<TaskList[]> => {
    return apiCall<TaskList[]>('/api/task-lists');
  }, [apiCall]);

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'created_at' | 'synced_at' | 'user_id'>): Promise<void> => {
    return apiCall<void>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }, [apiCall]);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    return apiCall<void>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }, [apiCall]);

  // Notes
  const getNotes = useCallback(async (): Promise<KeepNote[]> => {
    return apiCall<KeepNote[]>('/api/notes');
  }, [apiCall]);

  // Search
  const search = useCallback(async (request: SearchRequest): Promise<{ tasks?: Task[]; notes?: KeepNote[] }> => {
    return apiCall<{ tasks?: Task[]; notes?: KeepNote[] }>('/api/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }, [apiCall]);

  // Sync
  const syncTasks = useCallback(async (): Promise<{ synced: { task_lists: number; tasks: number } }> => {
    return apiCall<{ synced: { task_lists: number; tasks: number } }>('/api/sync/tasks', {
      method: 'POST',
    });
  }, [apiCall]);

  // Chat
  const sendChatMessage = useCallback(async (request: ChatRequest): Promise<{
    response: string;
    tool_calls?: any[];
    timestamp: string;
  }> => {
    return apiCall<{
      response: string;
      tool_calls?: any[];
      timestamp: string;
    }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }, [apiCall]);

  const executeToolCall = useCallback(async (toolCall: any): Promise<{
    result: string;
    timestamp: string;
  }> => {
    return apiCall<{
      result: string;
      timestamp: string;
    }>('/api/chat/execute-tool', {
      method: 'POST',
      body: JSON.stringify(toolCall),
    });
  }, [apiCall]);

  // User settings
  const getUserSettings = useCallback(async (): Promise<{ openai_api_key_configured: boolean }> => {
    return apiCall<{ openai_api_key_configured: boolean }>('/api/user/settings');
  }, [apiCall]);

  const updateUserSettings = useCallback(async (settings: { openai_api_key?: string }): Promise<void> => {
    return apiCall<void>('/api/user/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }, [apiCall]);

  return {
    loading,
    error,
    checkGoogleOAuthStatus,
    requestGoogleOAuth,
    getTasks,
    getTaskLists,
    createTask,
    deleteTask,
    getNotes,
    search,
    syncTasks,
    sendChatMessage,
    executeToolCall,
    getUserSettings,
    updateUserSettings,
  };
}
