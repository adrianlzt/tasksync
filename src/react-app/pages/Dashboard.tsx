import { useState, useEffect, useMemo } from 'react';
import { RotateCcw, RefreshCw, MessageSquare, CheckSquare, User, LogOut, Link, AlertCircle, Settings, ArrowDownAz, Calendar, ArrowUp, ArrowDown, Star, X } from 'lucide-react';
import { useAuth } from "../providers/AuthProvider";
import { Task, TaskList } from '@/shared/types';
import { getTaskLists, getTasks, deleteTask, updateTask } from '../lib/googleApi';
import {
  getStoredTasks,
  getStoredTaskLists,
  getStoredTaskToTaskListMap,
  storeTasks,
  storeTaskLists,
  storeTaskToTaskListMap,
  deleteStoredTask,
  clearStoredData,
} from '../lib/db';
import SearchBar from '@/react-app/components/SearchBar';
import TaskCard from '@/react-app/components/TaskCard';
import ChatInterface from '@/react-app/components/ChatInterface';
import SettingsModal from '@/react-app/components/SettingsModal';

export default function Dashboard() {
  const { user, logout, accessToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [_taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [taskToTaskListMap, setTaskToTaskListMap] = useState<Record<string, string>>({});
  const [taskListTitleMap, setTaskListTitleMap] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<{ tasks?: Task[] } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sortType, setSortType] = useState<'date' | 'alphabetical'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set Google connection status and load initial data from IndexedDB
  useEffect(() => {
    setGoogleConnected(!!user);
    if (!user) {
      setTasks([]);
      setTaskLists([]);
      setTaskToTaskListMap({});
      setTaskListTitleMap({});
      setLoading(false);
      return;
    }

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const [storedTasks, storedTaskLists, storedTaskMap] = await Promise.all([
          getStoredTasks(),
          getStoredTaskLists(),
          getStoredTaskToTaskListMap(),
        ]);

        if (storedTasks.length > 0 || storedTaskLists.length > 0) {
          setTasks(storedTasks);
          setTaskLists(storedTaskLists);
          setTaskListTitleMap(Object.fromEntries(storedTaskLists.map(l => [l.id, l.title])));
          setTaskToTaskListMap(storedTaskMap || {});
          setGoogleConnected(true);
        }
      } catch (err) {
        console.error('Failed to load data from IndexedDB', err);
        setError('Failed to load cached data.');
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await clearStoredData();
    } catch (err) {
      console.error('Failed to clear stored data on logout', err);
    }
    logout();
  };

  const handleSync = async () => {
    if (!accessToken) {
      setError("Not authenticated. Please log in again.");
      return;
    }
    setSyncing(true);
    setError(null);

    try {
      const fetchedTaskLists = await getTaskLists(accessToken);

      const taskMap: Record<string, string> = {};
      const allTasks: Task[] = [];

      const taskPromises = fetchedTaskLists.map(list => getTasks(accessToken, list.id));
      const tasksByList = await Promise.all(taskPromises);

      fetchedTaskLists.forEach((list, index) => {
        tasksByList[index].forEach(task => {
          allTasks.push(task);
          taskMap[task.id] = list.id;
        });
      });

      await clearStoredData();
      await Promise.all([
        storeTaskLists(fetchedTaskLists),
        storeTasks(allTasks),
        storeTaskToTaskListMap(taskMap),
      ]);

      setTaskLists(fetchedTaskLists);
      setTaskListTitleMap(Object.fromEntries(fetchedTaskLists.map(l => [l.id, l.title])));
      setTasks(allTasks);
      setTaskToTaskListMap(taskMap);

      setGoogleConnected(true);
    } catch (err) {
      setError('Failed to sync data from Google. Please try again.');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = (query: string, type: 'all' | 'tasks' | 'notes') => {
    if (!query.trim()) {
      clearSearch();
      return;
    }
    setLoading(true);
    const lowerCaseQuery = query.toLowerCase();

    const tasksById = new Map(tasks.map(t => [t.id, t]));

    const matchingTasks = tasks.filter(task =>
      task.title?.toLowerCase().includes(lowerCaseQuery) ||
      task.notes?.toLowerCase().includes(lowerCaseQuery)
    );

    const resultTaskSet = new Set<Task>();

    matchingTasks.forEach(matchedTask => {
      // Add matched task and its ancestors
      let current: Task | undefined = matchedTask;
      while (current) {
        resultTaskSet.add(current);
        current = current.parent ? tasksById.get(current.parent) : undefined;
      }
    });

    // Add all descendants of tasks in the result set
    const queue: Task[] = [...resultTaskSet];
    let head = 0;
    while(head < queue.length) {
        const current = queue[head++];
        const children = tasks.filter(t => t.parent === current.id);
        children.forEach(child => {
            if(!resultTaskSet.has(child)) {
                resultTaskSet.add(child);
                queue.push(child);
            }
        });
    }

    const results: { tasks?: Task[] } = { tasks: Array.from(resultTaskSet) };

    if (type === 'all' || type === 'notes') {
      // notes functionality is removed.
    }

    setSearchResults(results);
    setLoading(false);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!accessToken) {
      setError('Not authenticated. Please log in again.');
      return;
    }

    const taskListId = taskToTaskListMap[taskId];
    if (!taskListId) {
      setError('Could not determine the task list for this task. Please sync and try again.');
      return;
    }

    const originalTasks = [...tasks];

    // Optimistic update of local state
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));

    try {
      const updatedTask = await updateTask(accessToken, taskListId, taskId, updates);
      await storeTasks([updatedTask]);
      // Final update with data from server to ensure consistency
      setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Please try again.');
      setTasks(originalTasks); // Rollback on failure
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    const status = completed ? 'completed' : 'needsAction';
    await handleUpdateTask(taskId, { status });
  };

  const handleSortChange = (newSortType: 'date' | 'alphabetical') => {
    if (sortType === newSortType) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortType(newSortType);
      setSortDirection('asc');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!accessToken) {
      setError('Not authenticated. Please log in again.');
      return;
    }

    const taskListId = taskToTaskListMap[taskId];
    if (!taskListId) {
      setError('Could not determine the task list for this task. Please sync and try again.');
      return;
    }

    try {
      await deleteTask(accessToken, taskListId, taskId);
      await deleteStoredTask(taskId);

      // On success, remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (searchResults?.tasks) {
        setSearchResults(prev => ({
          tasks: prev?.tasks?.filter(t => t.id !== taskId),
        }));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
  };

  const sourceTasks = useMemo(() => searchResults?.tasks || tasks, [searchResults, tasks]);

  const { topLevelTasks, tasksByParent } = useMemo(() => {
    const tasksById = new Map(sourceTasks.map(t => [t.id, t]));
    const topLevelTasks: Task[] = [];
    const tasksByParent: Record<string, Task[]> = {};

    sourceTasks.forEach(task => {
      if (task.parent && tasksById.has(task.parent)) {
        if (!tasksByParent[task.parent]) {
          tasksByParent[task.parent] = [];
        }
        tasksByParent[task.parent].push(task);
      } else if (!task.parent) {
        topLevelTasks.push(task);
      }
    });

    const sortTasks = (taskArray: Task[]) => {
      return [...taskArray].sort((a, b) => {
        let comparison = 0;
        if (sortType === 'alphabetical') {
          comparison = (a.title || '').localeCompare(b.title || '');
        } else { // sort by 'date'
          const dateA_str = a.due || a.updated;
          const dateB_str = b.due || b.updated;
          const dateA = dateA_str ? new Date(dateA_str).getTime() : Infinity;
          const dateB = dateB_str ? new Date(dateB_str).getTime() : Infinity;

          if (dateA === dateB) {
            comparison = (a.title || '').localeCompare(b.title || '');
          } else {
            comparison = dateA - dateB;
          }
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    };

    for (const parentId in tasksByParent) {
      tasksByParent[parentId] = sortTasks(tasksByParent[parentId]);
    }

    return { topLevelTasks, tasksByParent };
  }, [sourceTasks, sortType, sortDirection]);

  const displayedTasks = useMemo(() => {
    if (activeTab === 'all') {
      return topLevelTasks;
    }
    if (activeTab === 'starred') {
      // Assuming a `starred` property on tasks.
      return topLevelTasks.filter(task => (task as any).starred);
    }
    return topLevelTasks.filter(task => taskToTaskListMap[task.id] === activeTab);
  }, [activeTab, topLevelTasks, taskToTaskListMap]);

  const completedTasks = useMemo(() => displayedTasks.filter(t => t.status === 'completed'), [displayedTasks]);
  const pendingTasks = useMemo(() => displayedTasks.filter(t => t.status !== 'completed'), [displayedTasks]);

  const sortedPendingTasks = useMemo(() => {
    return [...pendingTasks].sort((a, b) => {
      let comparison = 0;
      if (sortType === 'alphabetical') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else { // sort by 'date'
        const dateA_str = a.due || a.updated;
        const dateB_str = b.due || b.updated;
        const dateA = dateA_str ? new Date(dateA_str).getTime() : Infinity;
        const dateB = dateB_str ? new Date(dateB_str).getTime() : Infinity;

        if (dateA === dateB) {
          comparison = (a.title || '').localeCompare(b.title || '');
        } else {
          comparison = dateA - dateB;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [pendingTasks, sortType, sortDirection]);

  const sortedCompletedTasks = useMemo(() => {
    return [...completedTasks].sort((a, b) => {
      let comparison = 0;
      if (sortType === 'alphabetical') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else { // sort by 'date'
        const dateA_str = a.due || a.updated;
        const dateB_str = b.due || b.updated;
        const dateA = dateA_str ? new Date(dateA_str).getTime() : 0;
        const dateB = dateB_str ? new Date(dateB_str).getTime() : 0;

        if (dateA === dateB) {
          comparison = (a.title || '').localeCompare(b.title || '');
        } else {
          comparison = dateA - dateB; // asc: older first
        }
      }
      // For date sort on completed tasks, default to descending (most recent first)
      if (sortType === 'date') {
        return sortDirection === 'asc' ? -comparison : comparison;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [completedTasks, sortType, sortDirection]);

  const renderTaskTree = (task: Task): JSX.Element => (
    <div key={task.id}>
      <TaskCard
        task={task}
        onDelete={handleDeleteTask}
        onToggleComplete={handleToggleComplete}
        onUpdate={handleUpdateTask}
        taskListTitle={taskListTitleMap[taskToTaskListMap[task.id]]}
      />
      {tasksByParent[task.id] && tasksByParent[task.id].length > 0 && (
        <div className="pt-3 pl-5 ml-5 mt-3 border-l-2 border-gray-200 space-y-3">
          {tasksByParent[task.id].map(renderTaskTree)}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">TaskKeep Chat</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Google Connection Status */}
              {!googleConnected && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Google not connected</span>
                </div>
              )}

              {/* Sync Button */}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {syncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : googleConnected ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                {syncing ? 'Syncing...' : googleConnected ? 'Sync Google' : 'Connect Google'}
              </button>

              <button
                onClick={() => setShowChat(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI Chat</span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700">{user?.email}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowSettings(true);
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar onSearch={handleSearch} loading={loading} />
          {searchResults && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing search results
              </span>
              <button
                onClick={clearSearch}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto pb-px">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('starred')}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'starred'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Star className="w-4 h-4" />
                Starred
              </button>
              {_taskLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setActiveTab(list.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === list.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {list.title}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
            {/* Pending Tasks */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {searchResults ? 'Search Results' : 'Pending Tasks'}
                </h2>
                {!searchResults && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Sort by:</span>
                    <button
                      onClick={() => handleSortChange('date')}
                      className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${sortType === 'date' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <Calendar className="w-4 h-4" />
                      Date
                      {sortType === 'date' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSortChange('alphabetical')}
                      className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${sortType === 'alphabetical' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <ArrowDownAz className="w-4 h-4" />
                      Alphabetical
                      {sortType === 'alphabetical' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {sortedPendingTasks.map(renderTaskTree)}
              </div>
              {sortedPendingTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchResults ? 'No matching tasks found.' : 'No pending tasks.'}
                </div>
              )}
            </div>

            {/* Completed Tasks */}
            {!searchResults && sortedCompletedTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Completed Tasks
                </h2>
                <div className="space-y-3">
                  {sortedCompletedTasks.map(renderTaskTree)}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50" onClick={() => setShowChat(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                AI Chat
              </h2>
              <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-gray-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-grow p-4 overflow-auto">
              <ChatInterface onOpenSettings={() => { setShowSettings(true); setShowChat(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
