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
}

export interface GitHubWorkflowResult {
  success: boolean;
  repositoryAnalysis?: RepoAnalysis;
  branchName?: string;
  pullRequestNumber?: number;
  changes: string[];
  errors: string[];
}

export class GitHubWorkflow {
  private taskRunner: TaskRunner;

  constructor() {
    this.taskRunner = new TaskRunner();
  }

  /**
   * Execute a complete GitHub workflow: analyze repo, create tasks, implement changes, create PR
   */
  async executeWorkflow(config: GitHubWorkflowConfig): Promise<GitHubWorkflowResult> {
    const result: GitHubWorkflowResult = {
      success: false,
      changes: [],
      errors: []
    };

    try {
      console.log(`🚀 Starting GitHub workflow for: ${config.repositoryUrl}`);
      
      // Step 1: Initialize GitHub integration
      await this.initializeGitHub();

      // Step 2: Parse repository URL
      const repo = parseGitHubUrl(config.repositoryUrl);
      if (!repo) {
        throw new Error('Invalid GitHub repository URL');
      }

      // Step 3: Analyze repository
      console.log('📊 Analyzing repository...');
      const analysis = await githubIntegration.analyzeRepository(repo);
      result.repositoryAnalysis = analysis;

      // Step 4: Generate AI tasks based on repository analysis and user request
      console.log('🧠 Generating AI tasks...');
      const tasks = await this.generateTasksFromAnalysis(analysis, config.taskDescription, repo);

      // Step 5: Create development branch
      if (config.createPR !== false) {
        const branchName = generateBranchName(config.taskDescription);
        await githubIntegration.createBranch(repo, branchName, config.baseBranch || 'main');
        result.branchName = branchName;
        repo.branch = branchName;
      }

      // Step 6: Execute tasks and implement changes
      console.log('⚙️ Executing tasks...');
      const taskResults = await this.executeTasks(tasks, repo);
      result.changes = taskResults.changes;
      result.errors = taskResults.errors;

      // Step 7: Create pull request if requested
      if (config.createPR !== false && result.branchName && result.changes.length > 0) {
        console.log('📝 Creating pull request...');
        const prNumber = await this.createPullRequest(repo, config, result);
        result.pullRequestNumber = prNumber;
      }

      result.success = result.errors.length === 0;
      console.log(`✅ GitHub workflow completed successfully!`);

      return result;

    } catch (error) {
      console.error('❌ GitHub workflow failed:', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  /**
   * Initialize GitHub integration
   */
  private async initializeGitHub(): Promise<void> {
    if (!githubIntegration.isReady()) {
      await githubIntegration.initialize();
    }
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
