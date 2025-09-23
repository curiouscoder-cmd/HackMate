/**
 * GitHub Repository Analyzer and Automated PR Creator
 * Analyzes GitHub repositories and creates PRs with AI-generated code
 */

import { Octokit } from '@octokit/rest';
import { getOptimalModel } from '../ai/model-config';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface RepoAnalysis {
  structure: FileStructure[];
  technologies: string[];
  patterns: CodePattern[];
  recommendations: string[];
}

export interface FileStructure {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  content?: string;
  language?: string;
}

export interface CodePattern {
  pattern: string;
  description: string;
  examples: string[];
}

export interface PRCreationResult {
  prUrl: string;
  branchName: string;
  filesCreated: string[];
  description: string;
}

// Analyze GitHub repository structure and patterns
export const analyzeRepository = async (config: GitHubConfig): Promise<RepoAnalysis> => {
  try {
    const octokit = new Octokit({ auth: config.token });
    
    console.log(`🔍 Analyzing repository: ${config.owner}/${config.repo}`);
    
    // Get repository contents
    const { data: contents } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: ''
    });
    
    const structure: FileStructure[] = [];
    const technologies = new Set<string>();
    
    // Analyze repository structure
    if (Array.isArray(contents)) {
      for (const item of contents) {
        structure.push({
          path: item.path,
          type: item.type as 'file' | 'directory',
          size: item.size
        });
        
        // Detect technologies from file extensions
        if (item.type === 'file') {
          const ext = item.path.split('.').pop()?.toLowerCase();
          if (ext) {
            const techMap: Record<string, string> = {
              'js': 'JavaScript',
              'ts': 'TypeScript',
              'jsx': 'React',
              'tsx': 'React TypeScript',
              'py': 'Python',
              'java': 'Java',
              'go': 'Go',
              'rs': 'Rust',
              'php': 'PHP',
              'rb': 'Ruby',
              'json': 'JSON',
              'yml': 'YAML',
              'yaml': 'YAML',
              'md': 'Markdown'
            };
            
            if (techMap[ext]) {
              technologies.add(techMap[ext]);
            }
          }
        }
      }
    }
    
    // Get package.json for more detailed analysis
    let packageInfo = null;
    try {
      const { data: packageFile } = await octokit.rest.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path: 'package.json'
      });
      
      if ('content' in packageFile) {
        const content = Buffer.from(packageFile.content, 'base64').toString();
        packageInfo = JSON.parse(content);
        
        // Add dependencies to technologies
        if (packageInfo.dependencies) {
          Object.keys(packageInfo.dependencies).forEach(dep => {
            if (dep.includes('react')) technologies.add('React');
            if (dep.includes('vue')) technologies.add('Vue.js');
            if (dep.includes('angular')) technologies.add('Angular');
            if (dep.includes('next')) technologies.add('Next.js');
            if (dep.includes('express')) technologies.add('Express.js');
            if (dep.includes('fastify')) technologies.add('Fastify');
          });
        }
      }
    } catch (error) {
      console.log('No package.json found or error reading it');
    }
    
    // Analyze code patterns
    const patterns: CodePattern[] = await analyzeCodePatterns(octokit, config, structure);
    
    // Generate recommendations
    const recommendations = generateRecommendations(Array.from(technologies), patterns, packageInfo);
    
    return {
      structure,
      technologies: Array.from(technologies),
      patterns,
      recommendations
    };
    
  } catch (error) {
    console.error('Error analyzing repository:', error);
    throw error;
  }
};

// Analyze code patterns in the repository
const analyzeCodePatterns = async (
  octokit: Octokit, 
  config: GitHubConfig, 
  structure: FileStructure[]
): Promise<CodePattern[]> => {
  const patterns: CodePattern[] = [];
  
  // Sample a few key files for pattern analysis
  const keyFiles = structure
    .filter(item => item.type === 'file')
    .filter(item => {
      const ext = item.path.split('.').pop()?.toLowerCase();
      return ['js', 'ts', 'jsx', 'tsx', 'py', 'java'].includes(ext || '');
    })
    .slice(0, 5); // Analyze first 5 code files
  
  for (const file of keyFiles) {
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path: file.path
      });
      
      if ('content' in fileData) {
        const content = Buffer.from(fileData.content, 'base64').toString();
        
        // Analyze patterns
        if (content.includes('class ')) {
          patterns.push({
            pattern: 'Object-Oriented Programming',
            description: 'Uses class-based architecture',
            examples: [file.path]
          });
        }
        
        if (content.includes('function ') || content.includes('const ') || content.includes('=>')) {
          patterns.push({
            pattern: 'Functional Programming',
            description: 'Uses functional programming patterns',
            examples: [file.path]
          });
        }
        
        if (content.includes('async ') || content.includes('await ')) {
          patterns.push({
            pattern: 'Asynchronous Programming',
            description: 'Uses async/await patterns',
            examples: [file.path]
          });
        }
        
        if (content.includes('import ') || content.includes('require(')) {
          patterns.push({
            pattern: 'Modular Architecture',
            description: 'Uses modular imports/exports',
            examples: [file.path]
          });
        }
      }
    } catch (error) {
      console.log(`Could not analyze file: ${file.path}`);
    }
  }
  
  return patterns;
};

// Generate recommendations based on analysis
const generateRecommendations = (
  technologies: string[], 
  patterns: CodePattern[], 
  packageInfo: any
): string[] => {
  const recommendations: string[] = [];
  
  // Technology-based recommendations
  if (technologies.includes('React') && !technologies.includes('TypeScript')) {
    recommendations.push('Consider migrating to TypeScript for better type safety');
  }
  
  if (technologies.includes('JavaScript') && !packageInfo?.scripts?.test) {
    recommendations.push('Add unit testing framework (Jest, Vitest, etc.)');
  }
  
  if (!technologies.includes('ESLint') && !packageInfo?.devDependencies?.eslint) {
    recommendations.push('Add ESLint for code quality and consistency');
  }
  
  if (!packageInfo?.scripts?.build) {
    recommendations.push('Add build scripts for production deployment');
  }
  
  // Pattern-based recommendations
  const hasAsync = patterns.some(p => p.pattern === 'Asynchronous Programming');
  if (hasAsync) {
    recommendations.push('Consider adding error handling for async operations');
  }
  
  const hasModular = patterns.some(p => p.pattern === 'Modular Architecture');
  if (!hasModular) {
    recommendations.push('Consider refactoring to use modular architecture');
  }
  
  return recommendations;
};

// Create AI-generated code and PR
export const createAIPoweredPR = async (
  config: GitHubConfig,
  task: string,
  repoAnalysis: RepoAnalysis
): Promise<PRCreationResult> => {
  try {
    const octokit = new Octokit({ auth: config.token });
    
    console.log(`🤖 Creating AI-powered PR for: ${task}`);
    
    // Generate code using AI based on repository analysis
    const generatedCode = await generateCodeForTask(task, repoAnalysis);
    
    // Create a new branch
    const branchName = `ai-feature/${task.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    // Get the default branch SHA
    const { data: ref } = await octokit.rest.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: 'heads/main'
    });
    
    // Create new branch
    await octokit.rest.git.createRef({
      owner: config.owner,
      repo: config.repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    });
    
    const filesCreated: string[] = [];
    
    // Create/update files with generated code
    for (const file of generatedCode.files) {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: config.owner,
        repo: config.repo,
        path: file.path,
        message: `feat: ${file.description}`,
        content: Buffer.from(file.content).toString('base64'),
        branch: branchName
      });
      
      filesCreated.push(file.path);
    }
    
    // Create PR
    const { data: pr } = await octokit.rest.pulls.create({
      owner: config.owner,
      repo: config.repo,
      title: `🤖 AI-Generated: ${task}`,
      head: branchName,
      base: 'main',
      body: generatePRDescription(task, repoAnalysis, generatedCode, filesCreated)
    });
    
    console.log(`✅ PR created successfully: ${pr.html_url}`);
    
    return {
      prUrl: pr.html_url,
      branchName,
      filesCreated,
      description: generatedCode.description
    };
    
  } catch (error) {
    console.error('Error creating AI-powered PR:', error);
    throw error;
  }
};

// Generate code using AI based on task and repository analysis
const generateCodeForTask = async (task: string, repoAnalysis: RepoAnalysis) => {
  try {
    // Use the optimal model for coding
    const optimalModel = getOptimalModel('CODING');
    
    // Dynamic import to avoid dependency issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: optimalModel.primary.name });
    
    const prompt = `
      As a senior software engineer, analyze this repository and implement the requested task.
      
      TASK: ${task}
      
      REPOSITORY ANALYSIS:
      Technologies: ${repoAnalysis.technologies.join(', ')}
      Code Patterns: ${repoAnalysis.patterns.map(p => p.pattern).join(', ')}
      Recommendations: ${repoAnalysis.recommendations.join(', ')}
      
      REPOSITORY STRUCTURE:
      ${repoAnalysis.structure.slice(0, 20).map(s => `${s.type}: ${s.path}`).join('\n')}
      
      Generate production-ready code that:
      1. Follows the existing code patterns and architecture
      2. Uses the same technologies and frameworks
      3. Implements best practices for the detected tech stack
      4. Includes proper error handling and documentation
      5. Is consistent with the existing codebase style
      
      Return a JSON response with:
      {
        "description": "Brief description of what was implemented",
        "files": [
          {
            "path": "relative/path/to/file.ext",
            "content": "complete file content",
            "description": "what this file does"
          }
        ],
        "testFiles": [
          {
            "path": "path/to/test.spec.ext",
            "content": "test file content",
            "description": "test description"
          }
        ]
      }
      
      Focus on creating 1-3 files maximum that implement the core functionality.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        description: parsed.description || 'AI-generated implementation',
        files: [
          ...(parsed.files || []),
          ...(parsed.testFiles || [])
        ]
      };
    }
    
    // Fallback if JSON parsing fails
    return {
      description: 'AI-generated implementation (fallback)',
      files: [
        {
          path: `src/${task.toLowerCase().replace(/\s+/g, '-')}.js`,
          content: `// ${task}\n// TODO: Implement ${task}\n\nexport default function ${task.replace(/\s+/g, '')}() {\n  // Implementation needed\n  console.log('${task} - Implementation needed');\n}\n`,
          description: `Implementation for ${task}`
        }
      ]
    };
    
  } catch (error) {
    console.error('Error generating code:', error);
    throw error;
  }
};

// Generate PR description
const generatePRDescription = (
  task: string,
  repoAnalysis: RepoAnalysis,
  generatedCode: any,
  filesCreated: string[]
): string => {
  return `
## 🤖 AI-Generated Implementation

**Task**: ${task}

### 📋 What was implemented:
${generatedCode.description}

### 📁 Files Created/Modified:
${filesCreated.map(file => `- \`${file}\``).join('\n')}

### 🔍 Repository Analysis:
- **Technologies**: ${repoAnalysis.technologies.join(', ')}
- **Code Patterns**: ${repoAnalysis.patterns.map(p => p.pattern).join(', ')}

### 🎯 Implementation Details:
- Follows existing code patterns and architecture
- Uses consistent naming conventions
- Includes proper error handling
- Maintains code quality standards

### 🧪 Testing:
- [ ] Unit tests included
- [ ] Integration tests needed
- [ ] Manual testing required

### 📝 Notes:
This PR was automatically generated by AI Hack Mate. Please review the code carefully before merging.

---
*Generated by AI Hack Mate - Automated Software Development Assistant*
  `;
};

// Main function to analyze repo and create PR
export const analyzeAndCreatePR = async (
  config: GitHubConfig,
  task: string
): Promise<PRCreationResult> => {
  console.log(`🚀 Starting automated development process...`);
  
  // Step 1: Analyze repository
  const repoAnalysis = await analyzeRepository(config);
  console.log(`✅ Repository analysis complete`);
  
  // Step 2: Create AI-powered PR
  const prResult = await createAIPoweredPR(config, task, repoAnalysis);
  console.log(`✅ AI-powered PR created: ${prResult.prUrl}`);
  
  return prResult;
};
