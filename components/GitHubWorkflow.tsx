'use client';

import React, { useState } from 'react';

interface GitHubWorkflowProps {
  onWorkflowStart?: () => void;
  onWorkflowComplete?: (result: any) => void;
}

interface WorkflowResult {
  success: boolean;
  message: string;
  data?: {
    repositoryAnalysis?: {
      technologies: string[];
      mainLanguage: string;
      fileCount: number;
      issueCount: number;
      codePatterns: string[];
    };
    branchName?: string;
    pullRequestNumber?: number;
    changes: string[];
    errors: string[];
    pullRequestUrl?: string;
  };
}

export default function GitHubWorkflow({ onWorkflowStart, onWorkflowComplete }: GitHubWorkflowProps) {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [createPR, setCreatePR] = useState(true);
  const [prTitle, setPrTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [repoAnalysis, setRepoAnalysis] = useState<any>(null);

  const analyzeRepository = async () => {
    if (!repositoryUrl.trim()) {
      alert('Please enter a GitHub repository URL');
      return;
    }

    setIsAnalyzing(true);
    setRepoAnalysis(null);

    try {
      const response = await fetch(`/api/github/workflow?repositoryUrl=${encodeURIComponent(repositoryUrl)}`);
      const data = await response.json();

      if (data.success) {
        setRepoAnalysis(data.data);
      } else {
        alert(`Analysis failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze repository');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeWorkflow = async () => {
    if (!repositoryUrl.trim() || !taskDescription.trim()) {
      alert('Please enter both repository URL and task description');
      return;
    }

    setIsLoading(true);
    setResult(null);
    onWorkflowStart?.();

    try {
      const response = await fetch('/api/github/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl,
          taskDescription,
          baseBranch,
          createPR,
          prTitle: prTitle || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
      onWorkflowComplete?.(data);

    } catch (error) {
      console.error('Workflow error:', error);
      const errorResult = {
        success: false,
        message: 'Failed to execute workflow',
        data: { changes: [], errors: ['Network error or server unavailable'] }
      };
      setResult(errorResult);
      onWorkflowComplete?.(errorResult);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setRepositoryUrl('');
    setTaskDescription('');
    setBaseBranch('main');
    setCreatePR(true);
    setPrTitle('');
    setResult(null);
    setRepoAnalysis(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🚀 GitHub AI Workflow
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Analyze a GitHub repository and let AI implement changes automatically
        </p>
      </div>

      {/* Repository Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          GitHub Repository URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isLoading}
          />
          <button
            onClick={analyzeRepository}
            disabled={isAnalyzing || isLoading || !repositoryUrl.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? '🔍 Analyzing...' : '🔍 Analyze'}
          </button>
        </div>
      </div>

      {/* Repository Analysis Results */}
      {repoAnalysis && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            📊 Repository Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Repository:</strong> {repoAnalysis.repository}</p>
              <p><strong>Main Language:</strong> {repoAnalysis.mainLanguage}</p>
              <p><strong>Files:</strong> {repoAnalysis.fileCount}</p>
              <p><strong>Open Issues:</strong> {repoAnalysis.issueCount}</p>
            </div>
            <div>
              <p><strong>Technologies:</strong></p>
              <div className="flex flex-wrap gap-1 mt-1">
                {repoAnalysis.technologies.map((tech: string) => (
                  <span key={tech} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs">
                    {tech}
                  </span>
                ))}
              </div>
              <p className="mt-2"><strong>Code Patterns:</strong></p>
              <div className="flex flex-wrap gap-1 mt-1">
                {repoAnalysis.codePatterns.map((pattern: string) => (
                  <span key={pattern} className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-xs">
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Task Description
        </label>
        <textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          placeholder="Describe what you want the AI to implement (e.g., 'Add a health endpoint that returns API status', 'Implement user authentication', 'Add unit tests for the user service')"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
      </div>

      {/* Advanced Options */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">⚙️ Options</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Base Branch
            </label>
            <input
              type="text"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pull Request Title (Optional)
            </label>
            <input
              type="text"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={createPR}
              onChange={(e) => setCreatePR(e.target.checked)}
              className="mr-2"
              disabled={isLoading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Create Pull Request automatically
            </span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={executeWorkflow}
          disabled={isLoading || !repositoryUrl.trim() || !taskDescription.trim()}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? '🤖 AI Working...' : '🚀 Execute Workflow'}
        </button>
        
        <button
          onClick={resetForm}
          disabled={isLoading}
          className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Reset
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-3"></div>
            <div>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                🤖 AI is working on your repository...
              </p>
              <p className="text-yellow-600 dark:text-yellow-300 text-sm mt-1">
                This may take a few minutes. The AI is analyzing code, generating tasks, and implementing changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={`p-4 rounded-lg border ${
          result.success 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 ${
            result.success 
              ? 'text-green-900 dark:text-green-100' 
              : 'text-red-900 dark:text-red-100'
          }`}>
            {result.success ? '✅ Workflow Completed!' : '❌ Workflow Failed'}
          </h3>
          
          <p className={`mb-4 ${
            result.success 
              ? 'text-green-800 dark:text-green-200' 
              : 'text-red-800 dark:text-red-200'
          }`}>
            {result.message}
          </p>

          {result.data && (
            <div className="space-y-4">
              {/* Repository Analysis */}
              {result.data.repositoryAnalysis && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">📊 Repository Analysis</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>Technologies: {result.data.repositoryAnalysis.technologies.join(', ')}</p>
                    <p>Main Language: {result.data.repositoryAnalysis.mainLanguage}</p>
                    <p>Files: {result.data.repositoryAnalysis.fileCount}</p>
                  </div>
                </div>
              )}

              {/* Branch and PR Info */}
              {result.data.branchName && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">🌿 Branch Created</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Branch: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{result.data.branchName}</code>
                  </p>
                </div>
              )}

              {/* Pull Request */}
              {result.data.pullRequestNumber && result.data.pullRequestUrl && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">📝 Pull Request Created</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    PR #{result.data.pullRequestNumber}: 
                    <a 
                      href={result.data.pullRequestUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View on GitHub →
                    </a>
                  </p>
                </div>
              )}

              {/* Changes Made */}
              {result.data.changes.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">✨ Changes Made</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {result.data.changes.map((change, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {result.data.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">⚠️ Errors</h4>
                  <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                    {result.data.errors.map((error, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
