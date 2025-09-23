#!/usr/bin/env node

/**
 * Simple test script to verify the AI agent system works
 * Run with: node test-ai-system.js
 */

// Register ts-node to allow requiring TypeScript source files directly
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

// Require the TypeScript module
const { TaskRunner } = require('./lib/core/task-runner.ts');

async function testAISystem() {
  console.log('🧪 Testing AI Hack Mate System...\n');

  try {
    // Initialize the task runner
    const taskRunner = new TaskRunner({
      enableAI: true,
      enableGitHub: false, // Disable for testing
      enableSlack: false,  // Disable for testing
      enableMemory: true
    });

    console.log('1. Initializing TaskRunner...');
    await taskRunner.initialize();
    console.log('✅ TaskRunner initialized\n');

    // Test agent status
    console.log('2. Checking agent status...');
    const status = taskRunner.getAgentStatus();
    console.log('Agent Status:', JSON.stringify(status, null, 2));
    console.log('✅ Agent status retrieved\n');

    // Test problem decomposition
    console.log('3. Testing problem decomposition...');
    const problem = "Create a simple REST API endpoint that returns 'Hello World'";
    
    console.log(`Problem: "${problem}"`);
    const taskId = await taskRunner.createTaskFromProblem(problem);
    console.log(`✅ Created task: ${taskId}\n`);

    // Wait a bit for tasks to process
    console.log('4. Waiting for tasks to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check all tasks
    console.log('5. Checking created tasks...');
    const allTasks = await taskRunner.getAllTasks();
    console.log(`Found ${allTasks.length} tasks:`);
    
    allTasks.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.title} (${task.status}) - Agent: ${task.agent}`);
      if (task.logs.length > 0) {
        console.log(`     Logs: ${task.logs[task.logs.length - 1]}`);
      }
    });

    // Test memory search
    console.log('\n6. Testing memory search...');
    const memoryResults = await taskRunner.searchMemory('API endpoint', 3);
    console.log(`Found ${memoryResults.length} memory entries related to "API endpoint"`);
    
    memoryResults.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.content.substring(0, 100)}...`);
    });

    console.log('\n🎉 AI Hack Mate System Test Completed Successfully!');
    console.log('\nNext steps:');
    console.log('1. Set up your API keys in .env.local');
    console.log('2. Optionally configure Pinecone for enhanced memory');
    console.log('3. Enable GitHub and Slack integrations');
    console.log('4. Start the development server: npm run dev');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure you have set GEMINI_API_KEY in your .env.local file');
    console.error('2. Check that all dependencies are installed: npm install');
    console.error('3. Verify your API keys are valid');
    
    process.exit(1);
  }
}

// Run the test
testAISystem().catch(console.error);
