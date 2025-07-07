import { useState, useEffect } from 'react';
import { RotateCcw, RefreshCw, MessageSquare, CheckSquare, StickyNote, User, LogOut, Link, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from "../providers/AuthProvider";
import { Task, TaskList, KeepNote } from '@/shared/types';
import { getTaskLists, getTasks, deleteTask } from '../lib/googleApi';
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
import NoteCard from '@/react-app/components/NoteCard';
import ChatInterface from '@/react-app/components/ChatInterface';
import SettingsModal from '@/react-app/components/SettingsModal';

export default function Dashboard() {
  const { user, logout, accessToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [taskToTaskListMap, setTaskToTaskListMap] = useState<Record<string, string>>({});
  const [taskListTitleMap, setTaskListTitleMap] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<{ tasks?: Task[]; notes?: KeepNote[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'chat'>('tasks');
  const [syncing, setSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
      setNotes([]);
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
      
      // Google Keep API is not public, so we clear notes on sync.
      setNotes([]);
      
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

    const results: { tasks?: Task[]; notes?: KeepNote[] } = {};

    if (type === 'all' || type === 'tasks') {
      results.tasks = tasks.filter(task =>
        task.title?.toLowerCase().includes(lowerCaseQuery) ||
        task.notes?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (type === 'all' || type === 'notes') {
      results.notes = notes.filter(note =>
        note.title?.toLowerCase().includes(lowerCaseQuery) ||
        // Assuming `textContent` for note body from `KeepNote` type
        note.textContent?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    setSearchResults(results);
    setLoading(false);
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
          ...prev,
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

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const pinnedNotes = notes.filter(n => n.pinned === 1);
  const regularNotes = notes.filter(n => n.pinned === 0);

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
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CheckSquare className="w-4 h-4 inline mr-2" />
                Tasks ({searchResults ? searchResults.tasks?.length || 0 : tasks.length})
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <StickyNote className="w-4 h-4 inline mr-2" />
                Notes ({searchResults ? searchResults.notes?.length || 0 : notes.length})
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                AI Chat
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Pending Tasks */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {searchResults ? 'Search Results' : 'Pending Tasks'}
              </h2>
              <div className="grid gap-3">
                {(searchResults?.tasks || pendingTasks).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={handleDeleteTask}
                    taskListTitle={taskListTitleMap[taskToTaskListMap[task.id]]}
                  />
                ))}
              </div>
              {(searchResults?.tasks || pendingTasks).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchResults ? 'No tasks found' : 'No pending tasks. Sync with Google to get started.'}
                </div>
              )}
            </div>

            {/* Completed Tasks */}
            {!searchResults && completedTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Completed Tasks
                </h2>
                <div className="grid gap-3">
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={handleDeleteTask}
                      taskListTitle={taskListTitleMap[taskToTaskListMap[task.id]]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            {/* Pinned Notes */}
            {!searchResults && pinnedNotes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Pinned Notes
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </div>
            )}

            {/* All/Regular Notes */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {searchResults ? 'Search Results' : 'Notes'}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(searchResults?.notes || regularNotes).map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
              {(searchResults?.notes || regularNotes).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchResults ? 'No notes found' : 'No notes available. Sync with Google to get started.'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-96">
            <ChatInterface onOpenSettings={() => setShowSettings(true)} />
          </div>
        )}
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
    </div>
  );
}
