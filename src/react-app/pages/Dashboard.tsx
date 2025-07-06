import { useState, useEffect } from 'react';
import { RotateCcw, RefreshCw, MessageSquare, CheckSquare, StickyNote, User, LogOut, Link, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from "../providers/AuthProvider";
import { useApi } from '@/react-app/hooks/useApi';
import { Task, TaskList, KeepNote } from '@/shared/types';
import SearchBar from '@/react-app/components/SearchBar';
import TaskCard from '@/react-app/components/TaskCard';
import NoteCard from '@/react-app/components/NoteCard';
import ChatInterface from '@/react-app/components/ChatInterface';
import SettingsModal from '@/react-app/components/SettingsModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [searchResults, setSearchResults] = useState<{ tasks?: Task[]; notes?: KeepNote[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'chat'>('tasks');
  const [syncing, setSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { 
    getTasks, 
    getTaskLists, 
    getNotes, 
    search, 
    syncTasks, 
    deleteTask,
    checkGoogleOAuthStatus,
    requestGoogleOAuth,
    loading, 
    error 
  } = useApi();

  // Load initial data
  useEffect(() => {
    loadData();
    checkGoogleStatus();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, taskListsData, notesData] = await Promise.all([
        getTasks(),
        getTaskLists(),
        getNotes(),
      ]);
      
      setTasks(tasksData);
      setTaskLists(taskListsData);
      setNotes(notesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const checkGoogleStatus = async () => {
    try {
      const status = await checkGoogleOAuthStatus();
      setGoogleConnected(status.connected);
    } catch (err) {
      console.error('Failed to check Google status:', err);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { authUrl } = await requestGoogleOAuth();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to request Google OAuth:', err);
    }
  };

  const handleSync = async () => {
    if (!googleConnected) {
      await handleConnectGoogle();
      return;
    }

    setSyncing(true);
    try {
      await syncTasks();
      await loadData(); // Reload data after sync
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async (query: string, type: 'all' | 'tasks' | 'notes') => {
    try {
      const results = await search({ query, type });
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      // Also update search results if they exist
      if (searchResults?.tasks) {
        setSearchResults(prev => ({
          ...prev,
          tasks: prev?.tasks?.filter(t => t.id !== taskId),
        }));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
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
                        onClick={logout}
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
                  />
                ))}
              </div>
              {(searchResults?.tasks || pendingTasks).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchResults ? 'No tasks found' : 'No pending tasks'}
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
                  {searchResults ? 'No notes found' : 'No notes available'}
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
