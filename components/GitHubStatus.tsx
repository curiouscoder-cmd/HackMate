'use client';

import { useState, useEffect } from 'react';

interface GitHubStatus {
  ready: boolean;
  message: string;
  instructions?: string[];
}

interface GitHubStatusResponse {
  success: boolean;
  error?: string;
  message?: string;
  instructions?: string[];
  githubStatus?: GitHubStatus;
  timestamp: string;
}

export default function GitHubStatus() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use a lightweight endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch('/api/github/workflow?repositoryUrl=https://github.com/octocat/Hello-World', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data: GitHubStatusResponse = await response.json();
      
      if (data.githubStatus) {
        setStatus(data.githubStatus);
      } else if (!data.success && data.instructions) {
        setStatus({
          ready: false,
          message: data.message || 'GitHub integration not available',
          instructions: data.instructions
        });
      } else {
        setStatus({
          ready: response.ok,
          message: data.message || (response.ok ? 'GitHub integration is working' : 'GitHub integration failed'),
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out - GitHub integration may be slow');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to check GitHub status');
      }
      setStatus({
        ready: false,
        message: 'Unable to check GitHub integration status'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Delay initial status check to not block page render
    const timer = setTimeout(() => {
      fetchStatus();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = () => {
    if (loading) return <span className="text-blue-500 animate-spin">🔄</span>;
    if (status?.ready) return <span className="text-green-500">✅</span>;
    return <span className="text-red-500">❌</span>;
  };

  const getStatusBadge = () => {
    if (loading) return <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">Checking...</span>;
    if (status?.ready) return <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">Connected</span>;
    return <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">Not Connected</span>;
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">GitHub Integration</h2>
            {getStatusBadge()}
          </div>
          <button 
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={fetchStatus}
            disabled={loading}
          >
            <span className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>🔄</span>
            Refresh
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          GitHub integration enables automated repository analysis and pull request creation
        </p>
      </div>
      
      <div className="p-6 space-y-4">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {status && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Status: {status.message}</p>
            </div>

            {!status.ready && status.instructions && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {status.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>

                <div className="space-y-3 pt-2 border-t">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white">Quick Setup:</h4>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">1. Create a GitHub Personal Access Token:</p>
                    <button 
                      className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                      onClick={() => window.open('https://github.com/settings/tokens/new', '_blank')}
                    >
                      <span>🔗</span>
                      Open GitHub Token Settings
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">2. Add to your .env.local file:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                        GITHUB_TOKEN=your_token_here
                      </code>
                      <button
                        className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                        onClick={() => copyToClipboard('GITHUB_TOKEN=your_token_here')}
                      >
                        {copied ? '✅' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">3. Required token permissions:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside ml-2">
                      <li>repo (Full control of private repositories)</li>
                      <li>workflow (Update GitHub Action workflows)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {status.ready && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    GitHub integration is working! You can now analyze repositories and create automated pull requests.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
