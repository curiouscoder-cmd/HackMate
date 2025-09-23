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

  constructor() {
    this.octokit = new Octokit();
  }

  /**
   * Initialize GitHub integration with authentication
   */
  async initialize(token?: string): Promise<void> {
    try {
      const authToken = token || process.env.GITHUB_TOKEN;
      
      if (!authToken) {
        console.warn('⚠️  GitHub token not provided. Some features may be limited.');
        return;
      }

      this.octokit = new Octokit({
        auth: authToken,
      });

      // Test authentication
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      console.log(`✅ GitHub integration initialized for user: ${user.login}`);
      this.isInitialized = true;

      // Store authentication info in memory
      await storeMemoryEntry({
        type: 'context',
        content: `GitHub integration initialized for user: ${user.login}`,
        metadata: {
          service: 'github',
          user: user.login,
          timestamp: new Date().toISOString(),
          tags: ['github', 'auth', 'integration'],
        }
      });

    } catch (error) {
      console.error('❌ Failed to initialize GitHub integration:', error);
      throw error;
    }
  }

  /**
   * Analyze a GitHub repository comprehensively
   */
  async analyzeRepository(repo: GitHubRepo): Promise<RepoAnalysis> {
    console.log(`🔍 Analyzing repository: ${repo.owner}/${repo.repo}`);

    try {
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
      // Get the SHA of the base branch
      const { data: baseRef } = await this.octokit.rest.git.getRef({
        owner: repo.owner,
        repo: repo.repo,
        ref: `heads/${baseBranch}`,
      });

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner: repo.owner,
        repo: repo.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.object.sha,
      });

      console.log(`✅ Created branch: ${branchName}`);
      return branchName;
    } catch (error) {
      console.error('❌ Failed to create branch:', error);
      throw error;
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
