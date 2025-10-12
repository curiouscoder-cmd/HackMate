import { v4 as uuidv4 } from 'uuid';
import { Task, PlannerResult, planTasks, getPlannerStatus } from '../agents/planner-agent';
import { CodeGenerationResult, executeCoderTask, getCoderStatus } from '../agents/coder-agent';
import { DebugResult, debugTask, runTests, getDebuggerStatus } from '../agents/debugger-agent';
import { PMUpdate, sendTaskUpdate, sendProjectSummary, getPMStatus } from '../agents/pm-agent';
import { MemoryManager } from './memory-manager';
import { sendPlanningComplete, sendTaskUpdate as sendSlackTaskUpdate, sendPRCreated, getSlackStatus } from '../integrations/slack';

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
      if (this.config.enableMemory) {
        await this.memory.initialize();
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

      // Send Slack notification about planning completion
      if (this.config.enableSlack) {
        await sendPlanningComplete(problem, planResult.tasks.length);
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
    // In serverless environments, we need to execute synchronously
    // to avoid timeout issues. For production, consider using a queue system.
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      // Execute synchronously in production
      for (const taskId of taskIds) {
        await this.executeTask(taskId);
      }
    } else {
      // Execute asynchronously in development
      setTimeout(async () => {
        for (const taskId of taskIds) {
          await this.executeTask(taskId);
        }
      }, 100);
    }
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
      
      // Send Slack notification
      console.log('🔍 Task Runner Debug:', {
        enableSlack: this.config.enableSlack,
        taskTitle: task.title,
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ? 'set' : 'not set'
      });
      
      if (this.config.enableSlack) {
        console.log('📢 Calling Slack notification for task start...');
        await sendSlackTaskUpdate(task.title, 'started', task.description);
      } else {
        console.log('❌ Slack disabled in config');
      }
      
      await sendTaskUpdate(task, 'started', {
        slackToken: this.config.enableSlack ? process.env.SLACK_BOT_TOKEN : undefined,
        channelId: this.config.enableSlack ? process.env.SLACK_CHANNEL_ID : undefined
      });

      let result: any;

      // Execute based on agent type (normalize agent names)
      const agentType = task.agent.toLowerCase().replace(/\s+/g, '').replace('agent', '');
      switch (agentType) {
        case 'planner':
          result = await this.executePlannerTask(task);
          break;
        case 'coder':
        case 'coding':
        case 'developer':
          result = await this.executeCoderTask(task);
          break;
        case 'debugger':
        case 'debug':
        case 'tester':
          result = await this.executeDebuggerTask(task);
          break;
        case 'pm':
        case 'projectmanager':
        case 'manager':
          result = await this.executePMTask(task);
          break;
        default:
          // Default to coder for unknown agents
          console.warn(`Unknown agent: ${task.agent}, defaulting to coder`);
          result = await this.executeCoderTask(task);
          break;
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

      // Send Slack notifications
      if (this.config.enableSlack) {
        await sendSlackTaskUpdate(task.title, 'completed', `Task completed successfully`);
        
        // If it's a coder task with PR, send PR notification
        if (task.agent === 'coder' && result?.prUrl) {
          await sendPRCreated(task.title, result.prUrl, result.filename || 'generated-code.js');
        }
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

      // Send Slack failure notification
      if (this.config.enableSlack) {
        await sendSlackTaskUpdate(task.title, 'failed', (error as Error).message);
      }

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

  async searchMemory(query: string, limit: number = 10): Promise<any[]> {
    if (!this.config.enableMemory) {
      return [];
    }
    
    return await this.memory.retrieve(query, limit);
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
      slack: getSlackStatus({ webhookUrl: this.config.enableSlack ? process.env.SLACK_WEBHOOK_URL : undefined }),
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
