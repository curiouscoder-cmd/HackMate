import { Octokit } from '@octokit/rest';
import { storeMemoryEntry, retrieveMemoryEntries } from '../core/vector-memory-manager';

export interface GitHubRepo {
  owner: string;
  repo: string;
  branch?: string;
}

export interface GitHubFile {
  path: string;
  content: string;
  sha?: string;
  type: 'file' | 'dir';
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
}

export interface PullRequestData {
  title: string;
  body: string;
  head: string; // branch name
  base: string; // target branch (usually 'main' or 'master')
  draft?: boolean;
}

export interface RepoAnalysis {
  structure: GitHubFile[];
  technologies: string[];
  mainLanguage: string;
  packageFiles: GitHubFile[];
  readmeContent?: string;
  issues: GitHubIssue[];
  recentCommits: any[];
  codePatterns: string[];
}

class GitHubIntegration {
  private octokit: Octokit;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private initializationStarted: boolean = false;
  private analysisCache: Map<string, { data: RepoAnalysis; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.octokit = new Octokit();
  }

  /**
   * Initialize GitHub integration with authentication (lazy)
   */
  async initialize(token?: string): Promise<void> {
    // Return existing promise if initialization is already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return Promise.resolve();
    }

    // Start initialization
    this.initializationStarted = true;
    this.initializationPromise = this.performInitialization(token);
    
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(token?: string): Promise<void> {
    try {
      const authToken = token || process.env.GITHUB_TOKEN;
      
      if (!authToken) {
        console.warn('⚠️  GitHub token not provided. GitHub features will be disabled.');
        console.warn('💡 To enable GitHub integration:');
        console.warn('   1. Create a Personal Access Token at https://github.com/settings/tokens');
        console.warn('   2. Add GITHUB_TOKEN=your_token_here to your .env.local file');
        console.warn('   3. Restart the application');
        this.isInitialized = false;
        return;
      }

      this.octokit = new Octokit({
        auth: authToken,
      });

      // Test authentication with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GitHub authentication timeout')), 5000)
      );
      
      const authPromise = this.octokit.rest.users.getAuthenticated();
      const { data: user } = await Promise.race([authPromise, timeoutPromise]) as any;
      
      console.log(`✅ GitHub integration initialized for user: ${user.login}`);
      this.isInitialized = true;

      // Store authentication info in memory (non-blocking)
      this.storeAuthInfo(user.login).catch(err => 
        console.warn('Failed to store GitHub auth info:', err.message)
      );

    } catch (error) {
      console.error('❌ Failed to initialize GitHub integration:', error);
      console.error('💡 Please check your GitHub token and try again.');
      this.isInitialized = false;
      // Don't throw error - allow app to continue without GitHub features
    }
  }

  /**
   * Store authentication info in memory (non-blocking)
   */
  private async storeAuthInfo(userLogin: string): Promise<void> {
    try {
      await storeMemoryEntry({
        type: 'context',
        content: `GitHub integration initialized for user: ${userLogin}`,
        metadata: {
          service: 'github',
          user: userLogin,
          timestamp: new Date().toISOString(),
          tags: ['github', 'auth', 'integration'],
        }
      });
    } catch (error) {
      // Silently fail - memory storage is not critical
    }
  }

  /**
   * Analyze a GitHub repository comprehensively (with caching)
   */
  async analyzeRepository(repo: GitHubRepo): Promise<RepoAnalysis> {
    const cacheKey = `${repo.owner}/${repo.repo}:${repo.branch || 'default'}`;
    
    // Check cache first
    const cached = this.analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`📋 Using cached analysis for: ${repo.owner}/${repo.repo}`);
      return cached.data;
    }

    console.log(`🔍 Analyzing repository: ${repo.owner}/${repo.repo}`);

    try {
      // Ensure GitHub is initialized
      if (!this.isInitialized && !this.initializationStarted) {
        await this.initialize();
      }

      if (!this.isInitialized) {
        throw new Error('GitHub integration not available');
      }

      const [structure, issues, commits, repoInfo] = await Promise.all([
        this.getRepositoryStructure(repo),
        this.getRepositoryIssues(repo),
        this.getRecentCommits(repo),
        this.getRepositoryInfo(repo)
      ]);

      // Analyze technologies and patterns
      const technologies = this.detectTechnologies(structure);
      const mainLanguage = repoInfo.language || 'Unknown';
      const packageFiles = structure.filter(file => 
        ['package.json', 'requirements.txt', 'Gemfile', 'pom.xml', 'build.gradle', 'Cargo.toml'].includes(file.path.split('/').pop() || '')
      );

      // Get README content
      let readmeContent: string | undefined;
      const readmeFile = structure.find(file => 
        file.path.toLowerCase().includes('readme') && file.type === 'file'
      );
      if (readmeFile) {
        readmeContent = await this.getFileContent(repo, readmeFile.path);
      }

      // Analyze code patterns
      const codePatterns = await this.analyzeCodePatterns(repo, structure);

      const analysis: RepoAnalysis = {
        structure,
        technologies,
        mainLanguage,
        packageFiles,
        readmeContent,
        issues,
        recentCommits: commits,
        codePatterns
      };

      // Store analysis in memory
      await storeMemoryEntry({
        type: 'context',
        content: `Repository analysis for ${repo.owner}/${repo.repo}: ${technologies.join(', ')} project with ${structure.length} files`,
        metadata: {
          service: 'github',
          repository: `${repo.owner}/${repo.repo}`,
          technologies,
          mainLanguage,
          fileCount: structure.length,
          issueCount: issues.length,
          timestamp: new Date().toISOString(),
          tags: ['github', 'analysis', 'repository', repo.repo],
        }
      });

      console.log(`✅ Repository analysis complete: ${technologies.join(', ')} project`);
      
      // Cache the analysis
      this.analysisCache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries (keep only last 10)
      if (this.analysisCache.size > 10) {
        const entries = Array.from(this.analysisCache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        this.analysisCache.clear();
        entries.slice(0, 10).forEach(([key, value]) => {
          this.analysisCache.set(key, value);
        });
      }
      
      return analysis;

    } catch (error) {
      console.error('❌ Failed to analyze repository:', error);
      throw error;
    }
  }

  /**
   * Get repository structure (files and directories)
   */
  private async getRepositoryStructure(repo: GitHubRepo, path: string = ''): Promise<GitHubFile[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: repo.owner,
        repo: repo.repo,
        path,
        ref: repo.branch,
      });

      const files: GitHubFile[] = [];
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item.type === 'file') {
          files.push({
            path: item.path,
            content: '', // Content loaded separately when needed
            sha: item.sha,
            type: 'file'
          });
        } else if (item.type === 'dir') {
          files.push({
            path: item.path,
            content: '',
            type: 'dir'
          });
          
          // Recursively get subdirectory contents (limit depth to avoid API limits)
          if (path.split('/').length < 3) {
            const subFiles = await this.getRepositoryStructure(repo, item.path);
            files.push(...subFiles);
          }
        }
      }

      return files;
    } catch (error) {
      console.error(`Error getting repository structure for path ${path}:`, error);
      return [];
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(repo: GitHubRepo, filePath: string): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: repo.owner,
        repo: repo.repo,
        path: filePath,
        ref: repo.branch,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return '';
    } catch (error) {
      console.error(`Error getting file content for ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Get repository issues
   */
  private async getRepositoryIssues(repo: GitHubRepo): Promise<GitHubIssue[]> {
    try {
      const { data } = await this.octokit.rest.issues.listForRepo({
        owner: repo.owner,
        repo: repo.repo,
        state: 'open',
        per_page: 50,
      });

      return data.map(issue => ({
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state as 'open' | 'closed',
        labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
        assignees: issue.assignees?.map(assignee => assignee.login) || [],
      }));
    } catch (error) {
      console.error('Error getting repository issues:', error);
      return [];
    }
  }

  /**
   * Get recent commits
   */
  private async getRecentCommits(repo: GitHubRepo): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner: repo.owner,
        repo: repo.repo,
        sha: repo.branch,
        per_page: 10,
      });

      return data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name,
        date: commit.commit.author?.date,
        url: commit.html_url,
      }));
    } catch (error) {
      console.error('Error getting recent commits:', error);
      return [];
    }
  }

  /**
   * Get repository information
   */
  private async getRepositoryInfo(repo: GitHubRepo): Promise<any> {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner: repo.owner,
        repo: repo.repo,
      });

      return data;
    } catch (error) {
      console.error('Error getting repository info:', error);
      return {};
    }
  }

  /**
   * Detect technologies used in the repository
   */
  private detectTechnologies(files: GitHubFile[]): string[] {
    const technologies = new Set<string>();
    
    files.forEach(file => {
      const fileName = file.path.split('/').pop() || '';
      const extension = fileName.split('.').pop() || '';

      // Package managers and config files
      if (fileName === 'package.json') technologies.add('Node.js');
      if (fileName === 'requirements.txt' || fileName === 'setup.py') technologies.add('Python');
      if (fileName === 'Gemfile') technologies.add('Ruby');
      if (fileName === 'pom.xml' || fileName === 'build.gradle') technologies.add('Java');
      if (fileName === 'Cargo.toml') technologies.add('Rust');
      if (fileName === 'go.mod') technologies.add('Go');
      if (fileName === 'composer.json') technologies.add('PHP');
      if (fileName === 'pubspec.yaml') technologies.add('Dart/Flutter');

      // Framework-specific files
      if (fileName === 'next.config.js' || fileName === 'next.config.ts') technologies.add('Next.js');
      if (fileName === 'nuxt.config.js' || fileName === 'nuxt.config.ts') technologies.add('Nuxt.js');
      if (fileName === 'angular.json') technologies.add('Angular');
      if (fileName === 'vue.config.js') technologies.add('Vue.js');
      if (fileName === 'svelte.config.js') technologies.add('Svelte');
      if (fileName === 'gatsby-config.js') technologies.add('Gatsby');

      // File extensions
      if (['ts', 'tsx'].includes(extension)) technologies.add('TypeScript');
      if (['js', 'jsx'].includes(extension)) technologies.add('JavaScript');
      if (extension === 'py') technologies.add('Python');
      if (['rb', 'rake'].includes(extension)) technologies.add('Ruby');
      if (extension === 'java') technologies.add('Java');
      if (extension === 'rs') technologies.add('Rust');
      if (extension === 'go') technologies.add('Go');
      if (extension === 'php') technologies.add('PHP');
      if (extension === 'dart') technologies.add('Dart');

      // Database and infrastructure
      if (fileName === 'docker-compose.yml' || fileName === 'Dockerfile') technologies.add('Docker');
      if (fileName === 'terraform.tf' || extension === 'tf') technologies.add('Terraform');
      if (fileName === 'kubernetes.yaml' || fileName === 'k8s.yaml') technologies.add('Kubernetes');
    });

    return Array.from(technologies);
  }

  /**
   * Analyze code patterns in the repository
   */
  private async analyzeCodePatterns(repo: GitHubRepo, files: GitHubFile[]): Promise<string[]> {
    const patterns: string[] = [];
    
    // Sample a few key files to analyze patterns
    const keyFiles = files.filter(file => 
      file.type === 'file' && 
      ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'rb', 'go', 'rs', 'php'].includes(
        file.path.split('.').pop() || ''
      )
    ).slice(0, 5);

    for (const file of keyFiles) {
      try {
        const content = await this.getFileContent(repo, file.path);
        
        // Detect common patterns
        if (content.includes('class ') && content.includes('extends')) patterns.push('Object-Oriented Programming');
        if (content.includes('function') || content.includes('=>')) patterns.push('Functional Programming');
        if (content.includes('async') && content.includes('await')) patterns.push('Async/Await Pattern');
        if (content.includes('Promise')) patterns.push('Promise-based');
        if (content.includes('import') || content.includes('require')) patterns.push('Modular Architecture');
        if (content.includes('test(') || content.includes('describe(')) patterns.push('Test-Driven Development');
        if (content.includes('useState') || content.includes('useEffect')) patterns.push('React Hooks');
        if (content.includes('@Component') || content.includes('@Injectable')) patterns.push('Decorator Pattern');
        
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return Array.from(new Set(patterns));
  }

  /**
   * Create a new branch for development
   */
  async createBranch(repo: GitHubRepo, branchName: string, baseBranch: string = 'main'): Promise<string> {
    try {
      // First, try to get the default branch if 'main' doesn't exist
      let actualBaseBranch = baseBranch;
      
      try {
        await this.octokit.rest.git.getRef({
          owner: repo.owner,
          repo: repo.repo,
          ref: `heads/${baseBranch}`,
        });
      } catch (error: any) {
        if (error.status === 404) {
          // Try 'master' as fallback
          try {
            await this.octokit.rest.git.getRef({
              owner: repo.owner,
              repo: repo.repo,
              ref: 'heads/master',
            });
            actualBaseBranch = 'master';
            console.log(`⚠️  Branch '${baseBranch}' not found, using 'master' instead`);
          } catch (masterError: any) {
            if (masterError.status === 404) {
              // Get repository info to find default branch
              const repoInfo = await this.octokit.rest.repos.get({
                owner: repo.owner,
                repo: repo.repo,
              });
              actualBaseBranch = repoInfo.data.default_branch;
              console.log(`⚠️  Using default branch: ${actualBaseBranch}`);
            } else {
              throw masterError;
            }
          }
        } else {
          throw error;
        }
      }

      // Get the SHA of the base branch
      const { data: baseRef } = await this.octokit.rest.git.getRef({
        owner: repo.owner,
        repo: repo.repo,
        ref: `heads/${actualBaseBranch}`,
      });

      // Check if branch already exists
      try {
        await this.octokit.rest.git.getRef({
          owner: repo.owner,
          repo: repo.repo,
          ref: `heads/${branchName}`,
        });
        console.log(`⚠️  Branch '${branchName}' already exists, using existing branch`);
        return branchName;
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
        // Branch doesn't exist, continue with creation
      }

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner: repo.owner,
        repo: repo.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.object.sha,
      });

      console.log(`✅ Created branch: ${branchName}`);
      return branchName;
    } catch (error: any) {
      console.error('❌ Failed to create branch:', error);
      
      // Provide specific error messages
      if (error.status === 403) {
        throw new Error('GitHub token does not have permission to create branches. Please ensure your token has "repo" permissions.');
      } else if (error.status === 404) {
        throw new Error(`Repository ${repo.owner}/${repo.repo} not found or not accessible.`);
      } else {
        throw new Error(`Failed to create branch: ${error.message}`);
      }
    }
  }

  /**
   * Update or create a file in the repository
   */
  async updateFile(
    repo: GitHubRepo, 
    filePath: string, 
    content: string, 
    message: string,
    branch?: string
  ): Promise<void> {
    try {
      let sha: string | undefined;

      // Try to get existing file SHA
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner: repo.owner,
          repo: repo.repo,
          path: filePath,
          ref: branch || repo.branch,
        });

        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (error) {
        // File doesn't exist, will create new
      }

      // Update or create file
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: repo.owner,
        repo: repo.repo,
        path: filePath,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch: branch || repo.branch,
      });

      console.log(`✅ Updated file: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to update file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(repo: GitHubRepo, prData: PullRequestData): Promise<number> {
    try {
      const { data } = await this.octokit.rest.pulls.create({
        owner: repo.owner,
        repo: repo.repo,
        title: prData.title,
        body: prData.body,
        head: prData.head,
        base: prData.base,
        draft: prData.draft || false,
      });

      console.log(`✅ Created pull request #${data.number}: ${prData.title}`);
      
      // Store PR info in memory
      await storeMemoryEntry({
        type: 'context',
        content: `Created pull request #${data.number}: ${prData.title}`,
        metadata: {
          service: 'github',
          repository: `${repo.owner}/${repo.repo}`,
          prNumber: data.number,
          prTitle: prData.title,
          branch: prData.head,
          timestamp: new Date().toISOString(),
          tags: ['github', 'pull-request', 'created'],
        }
      });

      return data.number;
    } catch (error) {
      console.error('❌ Failed to create pull request:', error);
      throw error;
    }
  }

  /**
   * Get relevant context for a repository task
   */
  async getRepositoryContext(repo: GitHubRepo, query: string): Promise<string> {
    try {
      const memories = await retrieveMemoryEntries(
        `${repo.owner}/${repo.repo} ${query}`,
        5
      );

      if (memories.length === 0) {
        return `No previous context found for repository ${repo.owner}/${repo.repo}`;
      }

      return memories
        .map(memory => `${memory.type}: ${memory.content}`)
        .join('\n\n');
    } catch (error) {
      console.error('Error getting repository context:', error);
      return '';
    }
  }

  /**
   * Check if GitHub integration is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get GitHub integration status with detailed information
   */
  getStatus(): { ready: boolean; message: string; instructions?: string[]; cacheInfo?: { size: number; maxAge: number }; permissions?: string[] } {
    const status = {
      ready: this.isInitialized,
      message: '',
      instructions: undefined as string[] | undefined,
      permissions: undefined as string[] | undefined,
      cacheInfo: {
        size: this.analysisCache.size,
        maxAge: Math.floor(this.CACHE_DURATION / 1000 / 60) // in minutes
      }
    };

    if (this.isInitialized) {
      status.message = 'GitHub integration is active and ready';
      status.permissions = ['Read repositories', 'Analyze code', 'Create branches (if token has write access)'];
      return status;
    }
    
    const hasToken = !!process.env.GITHUB_TOKEN;
    
    if (!hasToken) {
      status.message = 'GitHub token not configured';
      status.instructions = [
        'Create a Personal Access Token at https://github.com/settings/tokens',
        'Select "repo" scope for full repository access',
        'Add GITHUB_TOKEN=your_token_here to your .env.local file',
        'Restart the application'
      ];
      return status;
    }
    
    status.message = 'GitHub authentication failed - please check your token';
    status.instructions = [
      'Verify your GitHub token is valid and not expired',
      'Ensure the token has "repo" scope for write access',
      'Check if the token has access to the target repository',
      'Verify your internet connection'
    ];
    
    return status;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    console.log('🗑️ GitHub analysis cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[]; oldestEntry?: number } {
    const entries = Array.from(this.analysisCache.entries());
    const oldestEntry = entries.length > 0 
      ? Math.min(...entries.map(([, value]) => value.timestamp))
      : undefined;
    
    return {
      size: this.analysisCache.size,
      keys: entries.map(([key]) => key),
      oldestEntry
    };
  }
}

// Export singleton instance
export const githubIntegration = new GitHubIntegration();

// Helper functions
export const parseGitHubUrl = (url: string): GitHubRepo | null => {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace('.git', ''),
  };
};

export const generateBranchName = (taskDescription: string): string => {
  return `feature/${taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)}`;
};

export const generatePRDescription = (
  taskDescription: string,
  changes: string[],
  analysis?: RepoAnalysis
): string => {
  let description = `## 🤖 AI-Generated Changes\n\n`;
  description += `**Task**: ${taskDescription}\n\n`;
  
  if (analysis) {
    description += `**Repository Analysis**:\n`;
    description += `- Technologies: ${analysis.technologies.join(', ')}\n`;
    description += `- Main Language: ${analysis.mainLanguage}\n`;
    description += `- Files: ${analysis.structure.length}\n\n`;
  }

  description += `**Changes Made**:\n`;
  changes.forEach((change, index) => {
    description += `${index + 1}. ${change}\n`;
  });

  description += `\n---\n`;
  description += `*This PR was automatically generated by AI Hack Mate*`;

  return description;
};
