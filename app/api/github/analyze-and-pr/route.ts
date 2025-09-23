import { NextRequest, NextResponse } from 'next/server';
import { analyzeAndCreatePR, GitHubConfig } from '../../../../lib/integrations/github-analyzer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, githubConfig } = body;

    if (!task) {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    // Use provided config or environment variables
    const config: GitHubConfig = githubConfig || {
      token: process.env.GITHUB_TOKEN || '',
      owner: process.env.GITHUB_OWNER || '',
      repo: process.env.GITHUB_REPO || ''
    };

    if (!config.token || !config.owner || !config.repo) {
      return NextResponse.json(
        { error: 'GitHub configuration missing. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO' },
        { status: 400 }
      );
    }

    console.log(`🚀 API: Creating automated PR for: "${task}"`);
    
    // Analyze repository and create PR
    const prResult = await analyzeAndCreatePR(config, task);
    
    return NextResponse.json({
      success: true,
      prUrl: prResult.prUrl,
      branchName: prResult.branchName,
      filesCreated: prResult.filesCreated,
      description: prResult.description,
      message: 'Automated PR created successfully!'
    });

  } catch (error) {
    console.error('API Error creating automated PR:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create automated PR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'GitHub Analyzer API',
    endpoints: {
      'POST /api/github/analyze-and-pr': 'Create automated PR from task description'
    },
    requiredEnvVars: [
      'GITHUB_TOKEN',
      'GITHUB_OWNER', 
      'GITHUB_REPO',
      'GEMINI_API_KEY'
    ]
  });
}
