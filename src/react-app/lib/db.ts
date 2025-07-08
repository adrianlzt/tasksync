import { openDB, DBSchema } from 'idb';
import { Task, TaskList } from '@/shared/types';

const DB_NAME = 'tasksync-db';
const DB_VERSION = 1;
const TASKS_STORE = 'tasks';
const TASKLISTS_STORE = 'tasklists';
const KEYVAL_STORE = 'keyval';

interface TaskSyncDB extends DBSchema {
  [TASKS_STORE]: {
    key: string;
    value: Task;
  };
  [TASKLISTS_STORE]: {
    key: string;
    value: TaskList;
  };
  [KEYVAL_STORE]: {
    key: string;
    value: any;
  };
}

const dbPromise = openDB<TaskSyncDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(TASKS_STORE)) {
      db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(TASKLISTS_STORE)) {
      db.createObjectStore(TASKLISTS_STORE, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(KEYVAL_STORE)) {
      db.createObjectStore(KEYVAL_STORE);
    }
  },
});

export async function getStoredTasks(): Promise<Task[]> {
  return (await dbPromise).getAll(TASKS_STORE);
}

export async function getStoredTaskLists(): Promise<TaskList[]> {
  return (await dbPromise).getAll(TASKLISTS_STORE);
}

export async function getStoredTaskToTaskListMap(): Promise<Record<string, string> | undefined> {
  return (await dbPromise).get(KEYVAL_STORE, 'taskToTaskListMap');
}

export async function storeTasks(tasks: Task[]) {
  const db = await dbPromise;
  const tx = db.transaction(TASKS_STORE, 'readwrite');
  await Promise.all(tasks.map(task => tx.store.put(task)));
  return tx.done;
}

export async function storeTaskLists(taskLists: TaskList[]) {
    const db = await dbPromise;
    const tx = db.transaction(TASKLISTS_STORE, 'readwrite');
    await Promise.all(taskLists.map(list => tx.store.put(list)));
    return tx.done;
}

export async function storeTaskToTaskListMap(map: Record<string, string>) {
    return (await dbPromise).put(KEYVAL_STORE, map, 'taskToTaskListMap');
}

export async function deleteStoredTask(taskId: string) {
  return (await dbPromise).delete(TASKS_STORE, taskId);
}

export async function clearStoredData() {
    const db = await dbPromise;
    const txTasks = db.transaction(TASKS_STORE, 'readwrite');
    await txTasks.store.clear();
    const txLists = db.transaction(TASKLISTS_STORE, 'readwrite');
    await txLists.store.clear();
    const txKeyval = db.transaction(KEYVAL_STORE, 'readwrite');
    await txKeyval.store.clear();
    return Promise.all([txTasks.done, txLists.done, txKeyval.done]);
}
