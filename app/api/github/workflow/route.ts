import { NextRequest, NextResponse } from 'next/server';
import { githubWorkflow } from '../../../../lib/workflows/github-workflow';
import { GitHubWorkflowConfig } from '../../../../lib/workflows/github-workflow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.repositoryUrl || !body.taskDescription) {
      return NextResponse.json(
        { error: 'repositoryUrl and taskDescription are required' },
        { status: 400 }
      );
    }

    // Validate GitHub URL format
    if (!body.repositoryUrl.includes('github.com')) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    const config: GitHubWorkflowConfig = {
      repositoryUrl: body.repositoryUrl,
      taskDescription: body.taskDescription,
      baseBranch: body.baseBranch || 'main',
      createPR: body.createPR !== false, // Default to true
      prTitle: body.prTitle,
      prDescription: body.prDescription,
      autoMerge: body.autoMerge || false,
    };

    console.log(`🚀 Starting GitHub workflow for: ${config.repositoryUrl}`);
    console.log(`📝 Task: ${config.taskDescription}`);

    // Execute the workflow
    const result = await githubWorkflow.executeWorkflow(config);

    // Return comprehensive result
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'GitHub workflow completed successfully!' 
        : 'GitHub workflow completed with errors',
      data: {
        repositoryAnalysis: {
          technologies: result.repositoryAnalysis?.technologies || [],
          mainLanguage: result.repositoryAnalysis?.mainLanguage || 'Unknown',
          fileCount: result.repositoryAnalysis?.structure.length || 0,
          issueCount: result.repositoryAnalysis?.issues.length || 0,
          codePatterns: result.repositoryAnalysis?.codePatterns || [],
        },
        branchName: result.branchName,
        pullRequestNumber: result.pullRequestNumber,
        changes: result.changes,
        errors: result.errors,
        pullRequestUrl: result.pullRequestNumber 
          ? `${config.repositoryUrl}/pull/${result.pullRequestNumber}`
          : undefined,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ GitHub workflow API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repositoryUrl = searchParams.get('repositoryUrl');

  if (!repositoryUrl) {
    return NextResponse.json(
      { error: 'repositoryUrl parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Just analyze the repository without making changes
    const { githubIntegration, parseGitHubUrl } = await import('../../../../lib/integrations/github-integration');
    
    await githubIntegration.initialize();
    
    // Check if GitHub integration is ready
    const status = githubIntegration.getStatus();
    if (!status.ready) {
      return NextResponse.json({
        success: false,
        error: 'GitHub integration not available',
        message: status.message,
        instructions: status.instructions,
        githubStatus: status,
        timestamp: new Date().toISOString(),
      }, { status: 503 }); // Service Unavailable
    }
    
    const repo = parseGitHubUrl(repositoryUrl);
    if (!repo) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    const analysis = await githubIntegration.analyzeRepository(repo);

    return NextResponse.json({
      success: true,
      message: 'Repository analysis completed',
      data: {
        repository: `${repo.owner}/${repo.repo}`,
        technologies: analysis.technologies,
        mainLanguage: analysis.mainLanguage,
        fileCount: analysis.structure.length,
        issueCount: analysis.issues.length,
        codePatterns: analysis.codePatterns,
        hasReadme: !!analysis.readmeContent,
        packageFiles: analysis.packageFiles.map(f => f.path),
        recentCommits: analysis.recentCommits.slice(0, 3).map(c => ({
          message: c.message,
          author: c.author,
          date: c.date,
        })),
      },
      githubStatus: status,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Repository analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze repository',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
