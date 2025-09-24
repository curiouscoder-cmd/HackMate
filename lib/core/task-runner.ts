import { v4 as uuidv4 } from 'uuid';
import { Task, PlannerResult, planTasks, getPlannerStatus } from '../agents/planner-agent';
import { CodeGenerationResult, executeCoderTask, getCoderStatus } from '../agents/coder-agent';
import { DebugResult, debugTask, runTests, getDebuggerStatus } from '../agents/debugger-agent';
import { PMUpdate, sendTaskUpdate, sendProjectSummary, getPMStatus } from '../agents/pm-agent';
import { MemoryManager } from './memory-manager';
import { analyzeAndCreatePR, GitHubConfig } from '../integrations/github-analyzer';

export interface TaskRunnerConfig {
  enableAI?: boolean;
  enableGitHub?: boolean;
  enableSlack?: boolean;
  enableMemory?: boolean;
}

export class TaskRunner {
  private tasks: Map<string, Task> = new Map();
  private memory: MemoryManager;
  private config: TaskRunnerConfig;

  constructor(config: TaskRunnerConfig = {}) {
    this.config = {
      enableAI: true,
      enableGitHub: true,
      enableSlack: true,
      enableMemory: true,
      ...config
    };

    this.memory = new MemoryManager();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize memory asynchronously in the background to speed up startup
      if (this.config.enableMemory) {
        // Don't await memory initialization to speed up startup
        this.memory.initialize().catch(error => {
          console.error('⚠️ Memory initialization failed, continuing without memory:', error);
        });
      }
      console.log('✅ TaskRunner initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize TaskRunner:', error);
      throw error;
    }
  }

  async createTaskFromProblem(problem: string): Promise<string> {
    try {
      // Use planner to break down the problem
      const planResult: PlannerResult = await planTasks(problem, {
        apiKey: this.config.enableAI ? process.env.GEMINI_API_KEY : undefined,
        memoryManager: this.config.enableMemory ? this.memory : undefined
      });
      
      // Create tasks from the plan
      const taskIds: string[] = [];
      
      for (const taskData of planResult.tasks) {
        const task: Task = {
          id: uuidv4(),
          title: taskData.title,
          description: taskData.description,
          status: 'queued',
          agent: taskData.agent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          logs: [`Task created from problem: ${problem}`],
          metadata: taskData.metadata
        };

        this.tasks.set(task.id, task);
        taskIds.push(task.id);

        // Store in memory
        if (this.config.enableMemory) {
          await this.memory.addTaskContext(task.id, `Task created: ${task.title}`, { 
            status: task.status, 
            agent: task.agent 
          });
        }

        // Notify PM
        await sendTaskUpdate(task, 'created', {
          slackToken: this.config.enableSlack ? process.env.SLACK_BOT_TOKEN : undefined,
          channelId: this.config.enableSlack ? process.env.SLACK_CHANNEL_ID : undefined
        });
      }

      // Start executing tasks
      this.executeTasksAsync(taskIds);

      return taskIds[0]; // Return the first task ID
    } catch (error) {
      console.error('Error creating tasks from problem:', error);
      throw error;
    }
  }

  private async executeTasksAsync(taskIds: string[]): Promise<void> {
    // Execute tasks asynchronously without blocking
    setTimeout(async () => {
      for (const taskId of taskIds) {
        await this.executeTask(taskId);
      }
    }, 100);
  }

  async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    try {
      // Update task status
      task.status = 'in_progress';
      task.updatedAt = new Date().toISOString();
      task.logs.push(`Task execution started by ${task.agent} agent`);
      
      await sendTaskUpdate(task, 'started', {
        slackToken: this.config.enableSlack ? process.env.SLACK_BOT_TOKEN : undefined,
        channelId: this.config.enableSlack ? process.env.SLACK_CHANNEL_ID : undefined
      });

      let result: any;

      // Execute task based on agent (normalize agent names)
      const normalizedAgent = task.agent.toLowerCase().replace(/\s+agent$/i, '').trim();
      
      switch (normalizedAgent) {
        case 'planner':
          result = await this.executePlannerTask(task);
          break;
        case 'coder':
          result = await this.executeCoderTask(task);
          break;
        case 'debugger':
          result = await this.executeDebuggerTask(task);
          break;
        case 'pm':
          result = await this.executePMTask(task);
          break;
        default:
          throw new Error(`Unknown agent: ${task.agent} (normalized: ${normalizedAgent})`);
      }

      // Update task with results
      task.status = 'done';
      task.updatedAt = new Date().toISOString();
      task.logs.push(`Task completed successfully`);
      task.metadata = { ...task.metadata, result };

      // Store updated task in memory
      if (this.config.enableMemory) {
        await this.memory.addTaskContext(task.id, `Task completed: ${task.title}`, { 
          status: task.status, 
          agent: task.agent,
          result: result 
        });
      }

      await sendTaskUpdate(task, 'completed', {
        slackToken: this.config.enableSlack ? process.env.SLACK_BOT_TOKEN : undefined,
        channelId: this.config.enableSlack ? process.env.SLACK_CHANNEL_ID : undefined
      });
    } catch (error) {
      // Handle task failure
      task.status = 'failed';
      task.updatedAt = new Date().toISOString();
      task.logs.push(`Task failed: ${(error as Error).message}`);

      await sendTaskUpdate(task, 'failed', {
        slackToken: this.config.enableSlack ? process.env.SLACK_BOT_TOKEN : undefined,
        channelId: this.config.enableSlack ? process.env.SLACK_CHANNEL_ID : undefined
      });
      console.error(`Task ${taskId} failed:`, error);
    }
  }

  private async executePlannerTask(task: Task): Promise<any> {
    // Planner tasks are typically analysis or planning
    task.logs.push('Analyzing requirements and creating detailed plan');
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      type: 'analysis',
      summary: `Analysis completed for: ${task.title}`,
      recommendations: [
        'Follow established coding patterns',
        'Include comprehensive error handling',
        'Add appropriate tests'
      ]
    };
  }

  private async executeCoderTask(task: Task): Promise<CodeGenerationResult> {
    task.logs.push('Generating code implementation');
    
    const result = await executeCoderTask(task, {
      geminiApiKey: this.config.enableAI ? process.env.GEMINI_API_KEY : undefined,
      githubToken: this.config.enableGitHub ? process.env.GITHUB_TOKEN : undefined,
      githubOwner: this.config.enableGitHub ? process.env.GITHUB_OWNER : undefined,
      githubRepo: this.config.enableGitHub ? process.env.GITHUB_REPO : undefined
    });
    
    task.logs.push(`Generated ${result.filename}`);
    if (result.prUrl) {
      task.logs.push(`Created GitHub PR: ${result.prUrl}`);
    }
    
    return result;
  }

  private async executeDebuggerTask(task: Task): Promise<DebugResult> {
    task.logs.push('Running tests and debugging');
    
    const result = await debugTask(task, undefined, {
      apiKey: this.config.enableAI ? process.env.GEMINI_API_KEY : undefined
    });
    
    task.logs.push(`Debug analysis completed - Status: ${result.status}`);
    if (result.issues.length > 0) {
      task.logs.push(`Found ${result.issues.length} potential issues`);
    }
    
    return result;
  }

  private async executePMTask(task: Task): Promise<PMUpdate[]> {
    task.logs.push('Handling project management tasks');
    
    // Get all tasks for summary
    const allTasks = Array.from(this.tasks.values());
    const updates = await sendProjectSummary(allTasks, {
      slackToken: this.config.enableSlack ? process.env.SLACK_BOT_TOKEN : undefined,
      channelId: this.config.enableSlack ? process.env.SLACK_CHANNEL_ID : undefined
    });
    
    task.logs.push('Project summary sent to stakeholders');
    
    return updates;
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    return this.tasks.get(taskId);
  }

  async retryTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'failed') {
      throw new Error(`Task ${taskId} is not in failed state`);
    }

    // Reset task status
    task.status = 'queued';
    task.updatedAt = new Date().toISOString();
    task.logs.push('Task retry initiated');

    // Execute the task
    await this.executeTask(taskId);
  }

  async searchMemory(query: string, limit: number = 5) {
    if (!this.config.enableMemory) {
      return [];
    }
    
    return await this.memory.retrieve(query, limit);
  }

  // Create automated PR from problem description
  async createAutomatedPR(problem: string, githubConfig?: GitHubConfig): Promise<string | null> {
    try {
      if (!this.config.enableGitHub) {
        console.log('GitHub integration disabled');
        return null;
      }

      const config: GitHubConfig = githubConfig || {
        token: process.env.GITHUB_TOKEN || '',
        owner: process.env.GITHUB_OWNER || '',
        repo: process.env.GITHUB_REPO || ''
      };

      if (!config.token || !config.owner || !config.repo) {
        console.error('GitHub configuration missing');
        return null;
      }

      console.log(`🚀 Creating automated PR for: "${problem}"`);
      
      // Analyze repository and create PR
      const prResult = await analyzeAndCreatePR(config, problem);
      
      // Store the PR creation in memory
      if (this.config.enableMemory) {
        await this.memory.addTaskContext(
          'automated-pr',
          `Created automated PR: ${problem}`,
          {
            prUrl: prResult.prUrl,
            branchName: prResult.branchName,
            filesCreated: prResult.filesCreated,
            description: prResult.description
          }
        );
      }

      console.log(`✅ Automated PR created: ${prResult.prUrl}`);
      return prResult.prUrl;

    } catch (error) {
      console.error('Failed to create automated PR:', error);
      return null;
    }
  }

  getAgentStatus() {
    return {
      planner: getPlannerStatus({ apiKey: this.config.enableAI ? process.env.GEMINI_API_KEY : undefined }),
      coder: getCoderStatus({
        geminiApiKey: this.config.enableAI ? process.env.GEMINI_API_KEY : undefined,
        githubToken: this.config.enableGitHub ? process.env.GITHUB_TOKEN : undefined,
        githubOwner: this.config.enableGitHub ? process.env.GITHUB_OWNER : undefined,
        githubRepo: this.config.enableGitHub ? process.env.GITHUB_REPO : undefined
      }),
      debugger: getDebuggerStatus({ apiKey: this.config.enableAI ? process.env.GEMINI_API_KEY : undefined }),
      pm: getPMStatus({
        slackToken: this.config.enableSlack ? process.env.SLACK_BOT_TOKEN : undefined,
        channelId: this.config.enableSlack ? process.env.SLACK_CHANNEL_ID : undefined
      }),
      memory: { status: 'ready', type: 'in-memory' },
      taskCount: this.tasks.size,
      config: this.config
    };
  }

  // Cleanup method
  async shutdown(): Promise<void> {
    if (this.config.enableMemory) {
      await this.memory.clear();
    }
    console.log('TaskRunner shutdown complete');
  }
}
