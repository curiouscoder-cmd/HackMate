import { getOptimalModel } from '../ai/model-config';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'queued' | 'in_progress' | 'done' | 'failed';
  agent: string;
  createdAt: string;
  updatedAt: string;
  logs: string[];
  metadata?: any;
}

export interface PlannerResult {
  tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[];
  summary: string;
}

export interface PlannerConfig {
  apiKey?: string;
  memoryManager?: any; // VectorMemoryManager instance
}

// Fallback planning function
const createFallbackPlan = (problem: string): PlannerResult => {
  const tasks = [
    {
      title: 'Analyze Requirements',
      description: `Analyze the problem: "${problem}"`,
      status: 'queued' as const,
      agent: 'planner',
      logs: [],
      metadata: { type: 'analysis' }
    },
    {
      title: 'Generate Implementation Plan',
      description: 'Create detailed implementation strategy',
      status: 'queued' as const,
      agent: 'planner',
      logs: [],
      metadata: { type: 'planning' }
    },
    {
      title: 'Implement Solution',
      description: 'Code the solution based on requirements',
      status: 'queued' as const,
      agent: 'coder',
      logs: [],
      metadata: { type: 'implementation' }
    },
    {
      title: 'Test and Debug',
      description: 'Test the implementation and fix issues',
      status: 'queued' as const,
      agent: 'debugger',
      logs: [],
      metadata: { type: 'testing' }
    },
    {
      title: 'Update Documentation',
      description: 'Document the changes and notify stakeholders',
      status: 'queued' as const,
      agent: 'pm',
      logs: [],
      metadata: { type: 'documentation' }
    }
  ];

  return {
    summary: `Fallback plan for: ${problem}`,
    tasks
  };
};

// AI-powered planning function with memory context
const createAIPlan = async (problem: string, apiKey: string, memoryManager?: any): Promise<PlannerResult> => {
  try {
    // Dynamic import to avoid dependency issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const optimalModel = getOptimalModel('PLANNING');
    const model = genAI.getGenerativeModel({ model: optimalModel.primary.name });
    
    // Get relevant context from memory
    let contextInfo = '';
    if (memoryManager) {
      try {
        const relevantMemories = await memoryManager.getRelevantContext(problem, 5);
        if (relevantMemories.length > 0) {
          contextInfo = `
          
          RELEVANT CONTEXT FROM PREVIOUS WORK:
          ${relevantMemories.map((memory: any, index: number) => 
            `${index + 1}. ${memory.content} (Score: ${memory.score?.toFixed(2)})`
          ).join('\n')}
          
          Use this context to inform your planning decisions and avoid duplicating previous work.
          `;
        }
      } catch (error) {
        console.warn('Could not retrieve memory context:', error);
      }
    }
    
    const prompt = `
      As a senior software architect, break down this problem into specific, actionable tasks:
      
      Problem: "${problem}"
      ${contextInfo}
      
      Create a detailed plan with tasks that can be executed by different agents:
      - Planner Agent: Analysis and planning tasks
      - Coder Agent: Code generation and implementation
      - Debugger Agent: Testing and debugging tasks
      - PM Agent: Communication and project management
      
      Return a JSON response with this structure:
      {
        "summary": "Brief summary of the plan",
        "tasks": [
          {
            "title": "Task title",
            "description": "Detailed description",
            "status": "queued",
            "agent": "agent_name",
            "logs": [],
            "metadata": {}
          }
        ]
      }
      
      Make tasks specific and executable. Focus on practical implementation steps.
      Consider the context from previous work to make informed decisions.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Store the planning decision in memory
      if (memoryManager) {
        try {
          await memoryManager.addDecision(
            `Created plan for: ${problem}`,
            `Generated ${parsed.tasks?.length || 0} tasks: ${parsed.summary}`,
            { 
              problemType: 'planning',
              taskCount: parsed.tasks?.length || 0,
              agents: parsed.tasks?.map((t: any) => t.agent) || []
            }
          );
        } catch (error) {
          console.warn('Could not store planning decision in memory:', error);
        }
      }
      
      return {
        summary: parsed.summary || 'AI-generated task plan',
        tasks: parsed.tasks || []
      };
    }

    return createFallbackPlan(problem);
  } catch (error) {
    console.warn('AI planning failed, using fallback:', (error as Error).message);
    return createFallbackPlan(problem);
  }
};

// Main planner function
export const planTasks = async (problem: string, config?: PlannerConfig): Promise<PlannerResult> => {
  try {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      return await createAIPlan(problem, apiKey, config?.memoryManager);
    }
    
    return createFallbackPlan(problem);
  } catch (error) {
    console.error('Planner error:', (error as Error).message);
    return createFallbackPlan(problem);
  }
};

// Get planner status
export const getPlannerStatus = (config?: PlannerConfig) => {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  
  return {
    name: 'Planner Agent',
    status: 'ready',
    capabilities: ['task_planning', 'requirement_analysis'],
    aiEnabled: !!apiKey
  };
};
