import { Task } from './planner-agent';
import { getOptimalModel } from '../ai/model-config';

export interface CodeGenerationResult {
  code: string;
  filename: string;
  description: string;
  prUrl?: string;
}

export interface CoderConfig {
  geminiApiKey?: string;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
}

// Fallback code generation function
const createFallbackCode = (task: Task): CodeGenerationResult => {
  const templates = {
    api: `
// ${task.title}
// ${task.description}

export async function handler(req: any, res: any) {
  try {
    // TODO: Implement ${task.title}
    res.json({ message: 'Implementation needed for: ${task.title}' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
    `,
    component: `
// ${task.title}
// ${task.description}

import React from 'react';

interface Props {
  // TODO: Define props for ${task.title}
}

export default function Component({ }: Props) {
  return (
    <div>
      <h2>${task.title}</h2>
      <p>{/* TODO: Implement ${task.title} */}</p>
    </div>
  );
}
    `,
    utility: `
// ${task.title}
// ${task.description}

/**
 * TODO: Implement ${task.title}
 */
export function implementTask() {
  // Implementation needed for: ${task.description}
  throw new Error('Not implemented: ${task.title}');
}
    `
  };

  const type = task.metadata?.type || 'utility';
  const template = templates[type as keyof typeof templates] || templates.utility;

  return {
    code: template,
    filename: `${task.title.toLowerCase().replace(/\s+/g, '-')}.ts`,
    description: `Fallback implementation template for: ${task.title}`
  };
};

// GitHub PR creation function
const createGitHubPR = async (
  codeResult: CodeGenerationResult, 
  task: Task, 
  config: CoderConfig
): Promise<string | undefined> => {
  try {
    if (!config.githubToken || !config.githubOwner || !config.githubRepo) {
      return undefined;
    }

    // Dynamic import to avoid dependency issues
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: config.githubToken });

    const owner = config.githubOwner;
    const repo = config.githubRepo;
    const branchName = `feature/task-${task.id}-${Date.now()}`;

    // Create branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    });

    // Create file
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `generated/${codeResult.filename}`,
      message: `feat: ${task.title}`,
      content: Buffer.from(codeResult.code).toString('base64'),
      branch: branchName
    });

    // Create PR
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `🤖 ${task.title}`,
      head: branchName,
      base: 'main',
      body: `
## 🤖 AI-Generated Code

**Task**: ${task.title}
**Description**: ${task.description}

**Generated Code**: \`${codeResult.filename}\`

${codeResult.description}

---
*This PR was automatically created by AI Hack Mate*
      `
    });

    return pr.html_url;
  } catch (error) {
    console.error('Failed to create GitHub PR:', (error as Error).message);
    return undefined;
  }
};

// AI-powered code generation function
const createAICode = async (task: Task, config: CoderConfig): Promise<CodeGenerationResult> => {
  try {
    if (!config.geminiApiKey) {
      return createFallbackCode(task);
    }

    // Dynamic import to avoid dependency issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const optimalModel = getOptimalModel('CODING');
    const model = genAI.getGenerativeModel({ model: optimalModel.primary.name });
    
    const prompt = `
      As a senior software developer, implement this task:
      
      Title: ${task.title}
      Description: ${task.description}
      
      Generate production-ready code that:
      1. Follows best practices and modern patterns
      2. Includes proper error handling
      3. Is well-documented with comments
      4. Uses TypeScript when applicable
      5. Follows the existing project structure
      
      Return a JSON response with:
      {
        "filename": "suggested_filename.ext",
        "code": "complete code implementation",
        "description": "what this code does"
      }
      
      Focus on functional programming patterns and modern JavaScript/TypeScript.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Create GitHub PR if configured
      let prUrl;
      if (config.githubToken && config.githubOwner && config.githubRepo) {
        prUrl = await createGitHubPR(parsed, task, config);
      }

      return {
        code: parsed.code || '',
        filename: parsed.filename || 'generated-code.js',
        description: parsed.description || 'AI-generated code',
        prUrl
      };
    }

    return createFallbackCode(task);
  } catch (error) {
    console.warn('AI code generation failed, using fallback:', (error as Error).message);
    return createFallbackCode(task);
  }
};

// Main code execution function
export const executeCoderTask = async (task: Task, config?: CoderConfig): Promise<CodeGenerationResult> => {
  try {
    const finalConfig: CoderConfig = {
      geminiApiKey: config?.geminiApiKey || process.env.GEMINI_API_KEY,
      githubToken: config?.githubToken || process.env.GITHUB_TOKEN,
      githubOwner: config?.githubOwner || process.env.GITHUB_OWNER,
      githubRepo: config?.githubRepo || process.env.GITHUB_REPO,
      ...config
    };

    if (finalConfig.geminiApiKey) {
      return await createAICode(task, finalConfig);
    }
    
    return createFallbackCode(task);
  } catch (error) {
    console.error('Coder execution error:', (error as Error).message);
    return createFallbackCode(task);
  }
};

// Get coder status
export const getCoderStatus = (config?: CoderConfig) => {
  const finalConfig = {
    geminiApiKey: config?.geminiApiKey || process.env.GEMINI_API_KEY,
    githubToken: config?.githubToken || process.env.GITHUB_TOKEN,
    githubOwner: config?.githubOwner || process.env.GITHUB_OWNER,
    githubRepo: config?.githubRepo || process.env.GITHUB_REPO,
    ...config
  };

  return {
    name: 'Coder Agent',
    status: 'ready',
    capabilities: ['code_generation', 'github_integration'],
    aiEnabled: !!finalConfig.geminiApiKey,
    githubEnabled: !!(finalConfig.githubToken && finalConfig.githubOwner && finalConfig.githubRepo)
  };
};
