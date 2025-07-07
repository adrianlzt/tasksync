import { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import { useApi } from '@/react-app/hooks/useApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const { getUserSettings, updateUserSettings } = useApi();

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const settings = await getUserSettings();
      setIsConfigured(settings.openai_api_key_configured);
      setApiKey(''); // Don't show existing key for security
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage('Please enter an OpenAI API key');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await updateUserSettings({ openai_api_key: apiKey });
      setMessage('Settings saved successfully!');
      setIsConfigured(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setMessage('');

    try {
      await updateUserSettings({ openai_api_key: '' });
      setMessage('API key removed successfully!');
      setIsConfigured(false);
      setApiKey('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage('Failed to remove API key. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">OpenAI API Key</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enter your OpenAI API key to enable AI chat functionality. Your key is stored securely and only used for your requests.
            </p>

            {isConfigured && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">✓ API key is configured</p>
              </div>
            )}

            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isConfigured ? 'Enter new API key to replace existing' : 'sk-...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                OpenAI Platform
              </a>
            </p>
          </div>

          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('success')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save API Key'}
            </button>

            {isConfigured && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
