import { 
  githubIntegration, 
  GitHubRepo, 
  RepoAnalysis, 
  parseGitHubUrl, 
  generateBranchName, 
  generatePRDescription 
} from '../integrations/github-integration';
import { TaskRunner } from '../core/task-runner';
import { Task } from '../agents/planner-agent';
import { storeMemoryEntry } from '../core/vector-memory-manager';

export interface GitHubWorkflowConfig {
  repositoryUrl: string;
  taskDescription: string;
  baseBranch?: string;
  createPR?: boolean;
  prTitle?: string;
  prDescription?: string;
  autoMerge?: boolean;
  readOnlyMode?: boolean;
}

export interface GitHubWorkflowResult {
  success: boolean;
  repositoryAnalysis?: RepoAnalysis;
  branchName?: string;
  pullRequestNumber?: number;
  changes: string[];
  errors: string[];
  readOnlyMode?: boolean;
  suggestions?: string[];
  codeAnalysis?: string;
}

export class GitHubWorkflow {
  private taskRunner: TaskRunner;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;
  private workflowCache: Map<string, { result: GitHubWorkflowResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds for workflow results

  constructor() {
    this.taskRunner = new TaskRunner();
  }

  /**
   * Execute a complete GitHub workflow: analyze repo, create tasks, implement changes, create PR
   */
  async executeWorkflow(config: GitHubWorkflowConfig): Promise<GitHubWorkflowResult> {
    // Check cache first for recent identical requests
    const cacheKey = `${config.repositoryUrl}:${config.taskDescription}`;
    const cached = this.workflowCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('📋 Using cached workflow result');
      return cached.result;
    }

    const result: GitHubWorkflowResult = {
      success: false,
      changes: [],
      errors: []
    };

    try {
      console.log(`🚀 Starting GitHub workflow for: ${config.repositoryUrl}`);
      
      // Step 1: Initialize GitHub integration (lazy)
      await this.ensureInitialized();

      // Step 2: Parse repository URL
      const repo = parseGitHubUrl(config.repositoryUrl);
      if (!repo) {
        throw new Error('Invalid GitHub repository URL');
      }

      // Step 3: Analyze repository (with caching)
      console.log('📊 Analyzing repository...');
      const analysis = await githubIntegration.analyzeRepository(repo);
      result.repositoryAnalysis = analysis;

      // Step 4: Generate AI tasks based on repository analysis and user request
      console.log('🧠 Generating AI tasks...');
      const tasks = await this.generateTasksFromAnalysis(analysis, config.taskDescription, repo);

      // Step 5: Check permissions and decide on read-only mode
      let readOnlyMode = config.readOnlyMode || false;
      
      if (config.createPR !== false && !readOnlyMode) {
        try {
          // Test if we can create branches
          const branchName = generateBranchName(config.taskDescription);
          await githubIntegration.createBranch(repo, branchName, config.baseBranch || 'main');
          result.branchName = branchName;
          repo.branch = branchName;
        } catch (error: any) {
          if (error.message.includes('permission') || error.message.includes('403')) {
            console.log('⚠️  No write permissions detected, switching to read-only mode');
            readOnlyMode = true;
            result.readOnlyMode = true;
            result.errors.push('GitHub token has read-only access. Providing analysis and suggestions instead.');
          } else {
            throw error;
          }
        }
      }

      if (readOnlyMode) {
        // Step 6: Read-only analysis and suggestions
        console.log('🔍 Performing read-only analysis...');
        const analysisResult = await this.performReadOnlyAnalysis(tasks, repo, config.taskDescription);
        result.suggestions = analysisResult.suggestions;
        result.codeAnalysis = analysisResult.analysis;
        result.changes = [`Read-only analysis completed for: ${config.taskDescription}`];
      } else {
        // Step 6: Execute tasks and implement changes
        console.log('⚙️ Executing tasks...');
        const taskResults = await this.executeTasks(tasks, repo);
        result.changes = taskResults.changes;
        result.errors.push(...taskResults.errors);

        // Step 7: Create pull request if requested
        if (config.createPR !== false && result.branchName && result.changes.length > 0) {
          console.log('📝 Creating pull request...');
          try {
            const prNumber = await this.createPullRequest(repo, config, result);
            result.pullRequestNumber = prNumber;
          } catch (error: any) {
            result.errors.push(`Failed to create PR: ${error.message}`);
          }
        }
      }

      result.success = result.errors.length === 0;
      console.log(`✅ GitHub workflow completed successfully!`);

      // Cache the result
      this.workflowCache.set(cacheKey, {
        result: { ...result },
        timestamp: Date.now()
      });

      // Clean up old cache entries
      this.cleanupCache();

      return result;

    } catch (error) {
      console.error('❌ GitHub workflow failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
      
      // Don't cache failed results
      return result;
    }
  }

  /**
   * Ensure workflow is initialized (singleton pattern)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      // Initialize GitHub integration with timeout
      const initPromise = githubIntegration.initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GitHub initialization timeout')), 5000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
      
      if (!githubIntegration.isReady()) {
        throw new Error('GitHub integration not available');
      }
      
      this.isInitialized = true;
      console.log('✅ GitHub workflow initialized');
    } catch (error) {
      console.error('❌ GitHub workflow initialization failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.workflowCache.entries());
    for (const [key, value] of entries) {
      if (now - value.timestamp > this.CACHE_DURATION * 2) {
        this.workflowCache.delete(key);
      }
    }
  }

  /**
   * Clear workflow cache
   */
  clearCache(): void {
    this.workflowCache.clear();
    console.log('🗑️ GitHub workflow cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.workflowCache.size,
      keys: Array.from(this.workflowCache.keys())
    };
  }

  /**
   * Perform read-only analysis when write permissions are not available
   */
  private async performReadOnlyAnalysis(
    tasks: Task[], 
    repo: GitHubRepo, 
    taskDescription: string
  ): Promise<{ suggestions: string[]; analysis: string }> {
    const suggestions: string[] = [];
    let analysis = '';

    try {
      // Analyze the repository structure and provide suggestions
      const repoAnalysis = await githubIntegration.analyzeRepository(repo);
      
      analysis = `## Repository Analysis for: ${repo.owner}/${repo.repo}\n\n`;
      analysis += `**Task**: ${taskDescription}\n\n`;
      analysis += `**Technologies**: ${repoAnalysis.technologies.join(', ')}\n`;
      analysis += `**Main Language**: ${repoAnalysis.mainLanguage}\n`;
      analysis += `**File Count**: ${repoAnalysis.structure.length}\n`;
      analysis += `**Open Issues**: ${repoAnalysis.issues.length}\n\n`;
      
      // Generate specific suggestions based on the task
      suggestions.push(`📋 **Implementation Plan for "${taskDescription}"**`);
      
      if (repoAnalysis.technologies.includes('TypeScript') || repoAnalysis.technologies.includes('JavaScript')) {
        suggestions.push('🔧 Consider using TypeScript for better type safety');
        suggestions.push('📦 Review package.json for dependency updates');
      }
      
      if (repoAnalysis.technologies.includes('React') || repoAnalysis.technologies.includes('Next.js')) {
        suggestions.push('⚛️ Follow React best practices for component structure');
        suggestions.push('🎨 Consider using Tailwind CSS for consistent styling');
      }
      
      // Add task-specific suggestions
      if (taskDescription.toLowerCase().includes('ui') || taskDescription.toLowerCase().includes('component')) {
        suggestions.push('🎨 Ensure UI components follow the existing design system');
        suggestions.push('📱 Test responsive design across different screen sizes');
        suggestions.push('♿ Consider accessibility (ARIA labels, keyboard navigation)');
      }
      
      if (taskDescription.toLowerCase().includes('api') || taskDescription.toLowerCase().includes('endpoint')) {
        suggestions.push('🔒 Implement proper authentication and authorization');
        suggestions.push('📝 Add comprehensive API documentation');
        suggestions.push('🧪 Include unit and integration tests');
      }
      
      if (taskDescription.toLowerCase().includes('performance') || taskDescription.toLowerCase().includes('optimize')) {
        suggestions.push('⚡ Profile performance bottlenecks');
        suggestions.push('💾 Implement caching strategies');
        suggestions.push('📊 Add performance monitoring');
      }
      
      // Generic suggestions
      suggestions.push('🧪 Add comprehensive tests for new functionality');
      suggestions.push('📚 Update documentation and README if needed');
      suggestions.push('🔍 Run linting and code quality checks');
      suggestions.push('🚀 Consider CI/CD pipeline integration');
      
      // Add code patterns analysis
      if (repoAnalysis.codePatterns.length > 0) {
        analysis += `**Code Patterns Found**:\n`;
        repoAnalysis.codePatterns.forEach(pattern => {
          analysis += `- ${pattern}\n`;
        });
        analysis += '\n';
      }
      
      // Add recent activity context
      if (repoAnalysis.recentCommits.length > 0) {
        analysis += `**Recent Activity**:\n`;
        repoAnalysis.recentCommits.slice(0, 3).forEach(commit => {
          analysis += `- ${commit.message} (${commit.author})\n`;
        });
        analysis += '\n';
      }
      
      analysis += `**Next Steps**:\n`;
      analysis += `1. Review the suggestions above\n`;
      analysis += `2. Create a new branch for your changes\n`;
      analysis += `3. Implement the changes following the repository patterns\n`;
      analysis += `4. Test thoroughly before creating a pull request\n`;
      analysis += `5. Update documentation as needed\n\n`;
      
      analysis += `**Note**: This analysis was performed in read-only mode. To implement changes automatically, please ensure your GitHub token has 'repo' permissions.`;
      
    } catch (error) {
      console.error('Error in read-only analysis:', error);
      suggestions.push('❌ Unable to complete full analysis due to an error');
      analysis = `Error performing analysis: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return { suggestions, analysis };
  }

  /**
   * Generate AI tasks based on repository analysis and user request
   */
  private async generateTasksFromAnalysis(
    analysis: RepoAnalysis, 
    taskDescription: string, 
    repo: GitHubRepo
  ): Promise<Task[]> {
    // Create context for task generation
    const context = this.buildRepositoryContext(analysis, repo);
    
    // Store repository context in memory
    await storeMemoryEntry({
      type: 'context',
      content: context,
      metadata: {
        repository: `${repo.owner}/${repo.repo}`,
        taskDescription,
        timestamp: new Date().toISOString(),
        tags: ['github', 'repository-context', 'task-generation'],
      }
    });

    // Generate tasks using the existing task system
    const combinedProblem = `
Repository: ${repo.owner}/${repo.repo}
Task: ${taskDescription}

Repository Analysis:
${context}

Please implement the requested changes following the repository's patterns and best practices.
`;

    // Use the existing createTaskFromProblem method
    const mainTaskId = await this.taskRunner.createTaskFromProblem(combinedProblem);
    
    // Get the created task
    const mainTask = await this.taskRunner.getTask(mainTaskId);
    
    if (mainTask) {
      return [mainTask];
    }

    // Fallback: create basic tasks if planning fails
    return this.createFallbackTasks(taskDescription, repo, analysis);
  }

  /**
   * Build comprehensive repository context for AI agents
   */
  private buildRepositoryContext(analysis: RepoAnalysis, repo: GitHubRepo): string {
    let context = `Repository: ${repo.owner}/${repo.repo}\n\n`;
    
    context += `Technologies: ${analysis.technologies.join(', ')}\n`;
    context += `Main Language: ${analysis.mainLanguage}\n`;
    context += `Total Files: ${analysis.structure.length}\n\n`;

    if (analysis.readmeContent) {
      context += `README Content:\n${analysis.readmeContent.substring(0, 1000)}...\n\n`;
    }

    context += `Package Files:\n`;
    analysis.packageFiles.forEach(file => {
      context += `- ${file.path}\n`;
    });

    context += `\nCode Patterns:\n`;
    analysis.codePatterns.forEach(pattern => {
      context += `- ${pattern}\n`;
    });

    if (analysis.issues.length > 0) {
      context += `\nOpen Issues:\n`;
      analysis.issues.slice(0, 5).forEach(issue => {
        context += `- #${issue.number}: ${issue.title}\n`;
      });
    }

    context += `\nRecent Commits:\n`;
    analysis.recentCommits.slice(0, 3).forEach(commit => {
      context += `- ${commit.message} (${commit.author})\n`;
    });

    return context;
  }

  /**
   * Create fallback tasks when planning fails
   */
  private createFallbackTasks(taskDescription: string, repo: GitHubRepo, analysis: RepoAnalysis): Task[] {
    const tasks: Task[] = [];
    const baseId = Date.now().toString();
    
    const fallbackTasks = [
      {
        title: 'Analyze Repository Structure',
        description: `Analyze codebase structure for: ${taskDescription}`,
        agent: 'planner',
        metadata: { repository: `${repo.owner}/${repo.repo}`, analysis, type: 'analysis' }
      },
      {
        title: 'Implement Changes',
        description: `Implement changes for: ${taskDescription}`,
        agent: 'coder',
        metadata: { repository: `${repo.owner}/${repo.repo}`, analysis, type: 'implementation' }
      },
      {
        title: 'Add Tests',
        description: `Add tests for: ${taskDescription}`,
        agent: 'coder',
        metadata: { repository: `${repo.owner}/${repo.repo}`, analysis, type: 'testing' }
      }
    ];

    fallbackTasks.forEach((taskData, index) => {
      const task: Task = {
        id: `${baseId}_${index}`,
        title: taskData.title,
        description: taskData.description,
        status: 'queued',
        agent: taskData.agent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [`Task created for GitHub workflow: ${taskDescription}`],
        metadata: taskData.metadata
      };
      tasks.push(task);
    });

    return tasks;
  }

  /**
   * Determine task type based on description
   */
  private determineTaskType(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('test') || desc.includes('spec')) return 'testing';
    if (desc.includes('doc') || desc.includes('readme')) return 'documentation';
    if (desc.includes('fix') || desc.includes('bug')) return 'bug_fix';
    if (desc.includes('refactor') || desc.includes('clean')) return 'refactoring';
    if (desc.includes('analyze') || desc.includes('review')) return 'analysis';
    
    return 'implementation';
  }

  /**
   * Determine appropriate agent for task
   */
  private determineAgent(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('plan') || desc.includes('analyze') || desc.includes('design')) return 'planner';
    if (desc.includes('debug') || desc.includes('fix') || desc.includes('error')) return 'debugger';
    if (desc.includes('manage') || desc.includes('coordinate') || desc.includes('review')) return 'pm';
    
    return 'coder';
  }

  /**
   * Execute tasks and implement changes in the repository
   */
  private async executeTasks(tasks: Task[], repo: GitHubRepo): Promise<{changes: string[], errors: string[]}> {
    const changes: string[] = [];
    const errors: string[] = [];

    for (const task of tasks) {
      try {
        console.log(`🔄 Executing task: ${task.description}`);
        
        // Execute task using the existing task runner
        await this.taskRunner.executeTask(task.id);
        
        // Get updated task result
        const updatedTask = await this.taskRunner.getTask(task.id);
        
        if (updatedTask?.status === 'done') {
          // Process task result and apply changes to repository
          const taskChanges = await this.applyTaskResult(updatedTask, repo);
          changes.push(...taskChanges);
          
          console.log(`✅ Task completed: ${task.description}`);
        } else if (updatedTask?.status === 'failed') {
          const error = `Task failed: ${task.description} - ${updatedTask.logs.join('; ')}`;
          errors.push(error);
          console.error(`❌ ${error}`);
        }

      } catch (error) {
        const errorMsg = `Error executing task "${task.description}": ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return { changes, errors };
  }

  /**
   * Apply task result to the repository (create/update files)
   */
  private async applyTaskResult(task: Task, repo: GitHubRepo): Promise<string[]> {
    const changes: string[] = [];
    
    try {
      // Get result from task metadata
      const result = task.metadata?.result;
      
      if (typeof result === 'string') {
        // Look for code blocks or file specifications in the result
        const codeBlocks = this.extractCodeBlocks(result);
        
        for (const block of codeBlocks) {
          if (block.filename) {
            await githubIntegration.updateFile(
              repo,
              block.filename,
              block.content,
              `AI Update: ${task.description}`,
              repo.branch
            );
            changes.push(`Updated ${block.filename}`);
          }
        }
      } else if (result && typeof result === 'object') {
        // Handle structured result with file changes
        if (result.files) {
          for (const file of result.files) {
            await githubIntegration.updateFile(
              repo,
              file.path,
              file.content,
              `AI Update: ${task.description}`,
              repo.branch
            );
            changes.push(`Updated ${file.path}`);
          }
        }
      }

      // If no specific files were identified, create a summary file
      if (changes.length === 0 && result) {
        const timestamp = Date.now();
        const summaryPath = `ai-updates/${timestamp}-${task.agent}-task.md`;
        const summaryContent = `# AI Task Result\n\n**Task**: ${task.title}\n\n**Description**: ${task.description}\n\n**Agent**: ${task.agent}\n\n**Result**:\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}`;
        
        await githubIntegration.updateFile(
          repo,
          summaryPath,
          summaryContent,
          `AI Summary: ${task.description}`,
          repo.branch
        );
        changes.push(`Created ${summaryPath}`);
      }

    } catch (error) {
      console.error('Error applying task result:', error);
    }

    return changes;
  }

  /**
   * Extract code blocks from text result
   */
  private extractCodeBlocks(text: string): Array<{filename?: string, content: string, language?: string}> {
    const blocks: Array<{filename?: string, content: string, language?: string}> = [];
    
    // Match code blocks with optional filename
    const codeBlockRegex = /```(?:(\w+))?\s*(?:\/\/\s*(.+?))?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const [, language, filename, content] = match;
      blocks.push({
        language,
        filename: filename?.trim(),
        content: content.trim()
      });
    }

    // Also look for explicit file specifications
    const fileSpecRegex = /(?:File|Path|Create|Update):\s*([^\n]+)\n([\s\S]*?)(?=\n(?:File|Path|Create|Update):|$)/gi;
    
    while ((match = fileSpecRegex.exec(text)) !== null) {
      const [, filename, content] = match;
      blocks.push({
        filename: filename.trim(),
        content: content.trim()
      });
    }

    return blocks;
  }

  /**
   * Create pull request with generated changes
   */
  private async createPullRequest(
    repo: GitHubRepo, 
    config: GitHubWorkflowConfig, 
    result: GitHubWorkflowResult
  ): Promise<number> {
    const title = config.prTitle || `AI Implementation: ${config.taskDescription}`;
    const description = config.prDescription || generatePRDescription(
      config.taskDescription,
      result.changes,
      result.repositoryAnalysis
    );

    return await githubIntegration.createPullRequest(repo, {
      title,
      body: description,
      head: result.branchName!,
      base: config.baseBranch || 'main',
      draft: false
    });
  }
}

// Export singleton instance
export const githubWorkflow = new GitHubWorkflow();
