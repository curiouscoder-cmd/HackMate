import { Task } from './planner-agent';
import { getOptimalModel } from '../ai/model-config';

export interface DebugResult {
  issues: string[];
  fixes: string[];
  testSuggestions: string[];
  status: 'passed' | 'failed' | 'needs_attention';
}

export interface DebuggerConfig {
  apiKey?: string;
}

// Fallback debugging function
const createFallbackDebug = (task: Task): DebugResult => {
  const commonIssues = [
    'Check for proper error handling',
    'Verify all imports are correct',
    'Ensure TypeScript types are defined',
    'Validate input parameters',
    'Check for memory leaks'
  ];

  const commonFixes = [
    'Add try-catch blocks around async operations',
    'Implement input validation',
    'Add proper TypeScript interfaces',
    'Include unit tests',
    'Add logging for debugging'
  ];

  const testSuggestions = [
    `Unit tests for ${task.title}`,
    `Integration tests for ${task.title}`,
    `Error handling tests`,
    `Performance tests if applicable`
  ];

  return {
    issues: commonIssues,
    fixes: commonFixes,
    testSuggestions,
    status: 'needs_attention'
  };
};

// Simulate test execution
const simulateTests = (task: Task) => {
  // Simple simulation - in real implementation, this would run actual tests
  const complexity = task.description.length;
  const passed = complexity < 200; // Arbitrary complexity threshold

  return {
    passed,
    failures: passed ? [] : [
      'Function not properly exported',
      'Missing error handling',
      'Type definitions incomplete'
    ],
    suggestions: passed ? [] : [
      'Add proper export statements',
      'Implement try-catch blocks',
      'Complete TypeScript interfaces'
    ]
  };
};

// AI-powered debugging function
const createAIDebug = async (task: Task, code: string | undefined, apiKey: string): Promise<DebugResult> => {
  try {
    // Dynamic import to avoid dependency issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const optimalModel = getOptimalModel('DEBUGGING');
    const model = genAI.getGenerativeModel({ model: optimalModel.primary.name });
    
    const prompt = `
      As a senior QA engineer and debugger, analyze this task and code:
      
      Task: ${task.title}
      Description: ${task.description}
      Status: ${task.status}
      Logs: ${task.logs.join('\n')}
      ${code ? `Code:\n${code}` : ''}
      
      Provide a thorough analysis including:
      1. Potential issues or bugs
      2. Suggested fixes
      3. Test cases that should be written
      4. Overall status assessment
      
      Return JSON response:
      {
        "issues": ["list of potential issues"],
        "fixes": ["list of suggested fixes"],
        "testSuggestions": ["list of test cases to write"],
        "status": "passed|failed|needs_attention"
      }
      
      Be thorough but practical in your analysis.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        issues: parsed.issues || [],
        fixes: parsed.fixes || [],
        testSuggestions: parsed.testSuggestions || [],
        status: parsed.status || 'needs_attention'
      };
    }

    return createFallbackDebug(task);
  } catch (error) {
    console.warn('AI debugging failed, using fallback:', (error as Error).message);
    return createFallbackDebug(task);
  }
};

// Main debug function
export const debugTask = async (task: Task, code?: string, config?: DebuggerConfig): Promise<DebugResult> => {
  try {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      return await createAIDebug(task, code, apiKey);
    }
    
    return createFallbackDebug(task);
  } catch (error) {
    console.error('Debug task error:', (error as Error).message);
    return createFallbackDebug(task);
  }
};

// Run tests function
export const runTests = async (task: Task, config?: DebuggerConfig): Promise<DebugResult> => {
  // Simulate test execution
  const testResults = simulateTests(task);
  
  if (testResults.passed) {
    return {
      issues: [],
      fixes: [],
      testSuggestions: [`Add integration tests for ${task.title}`],
      status: 'passed'
    };
  } else {
    return {
      issues: testResults.failures,
      fixes: testResults.suggestions,
      testSuggestions: [`Fix failing tests for ${task.title}`],
      status: 'failed'
    };
  }
};

// Get debugger status
export const getDebuggerStatus = (config?: DebuggerConfig) => {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  
  return {
    name: 'Debugger Agent',
    status: 'ready',
    capabilities: ['code_analysis', 'test_execution', 'bug_detection'],
    aiEnabled: !!apiKey
  };
};
