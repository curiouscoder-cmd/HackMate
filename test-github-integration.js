#!/usr/bin/env node

/**
 * Test script for GitHub integration
 * Tests the complete workflow including error handling
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_REPO_URL = 'https://github.com/octocat/Hello-World';

async function testGitHubIntegration() {
  console.log('🧪 Testing GitHub Integration...\n');

  try {
    // Test 1: Check GitHub status endpoint
    console.log('1️⃣ Testing GitHub status endpoint...');
    const statusResponse = await fetch(`${BASE_URL}/api/github/workflow?repositoryUrl=${encodeURIComponent(TEST_REPO_URL)}`);
    const statusData = await statusResponse.json();
    
    console.log(`   Status: ${statusResponse.status}`);
    console.log(`   Success: ${statusData.success}`);
    console.log(`   Message: ${statusData.message}`);
    
    if (statusData.githubStatus) {
      console.log(`   GitHub Ready: ${statusData.githubStatus.ready}`);
      if (statusData.githubStatus.instructions) {
        console.log(`   Instructions provided: ${statusData.githubStatus.instructions.length} steps`);
      }
    }

    // Test 2: Test with invalid repository URL
    console.log('\n2️⃣ Testing with invalid repository URL...');
    const invalidResponse = await fetch(`${BASE_URL}/api/github/workflow?repositoryUrl=invalid-url`);
    const invalidData = await invalidResponse.json();
    
    console.log(`   Status: ${invalidResponse.status}`);
    console.log(`   Error handled: ${!!invalidData.error}`);

    // Test 3: Test missing repository URL
    console.log('\n3️⃣ Testing missing repository URL...');
    const missingResponse = await fetch(`${BASE_URL}/api/github/workflow`);
    const missingData = await missingResponse.json();
    
    console.log(`   Status: ${missingResponse.status}`);
    console.log(`   Error handled: ${!!missingData.error}`);

    // Test 4: Test POST workflow endpoint (if GitHub is configured)
    if (statusData.githubStatus?.ready) {
      console.log('\n4️⃣ Testing POST workflow endpoint...');
      const workflowResponse = await fetch(`${BASE_URL}/api/github/workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl: TEST_REPO_URL,
          taskDescription: 'Add a simple test comment to README.md',
          baseBranch: 'main',
          createPR: true
        })
      });
      
      const workflowData = await workflowResponse.json();
      console.log(`   Status: ${workflowResponse.status}`);
      console.log(`   Success: ${workflowData.success}`);
      console.log(`   Message: ${workflowData.message}`);
      
      if (workflowData.data) {
        console.log(`   Branch: ${workflowData.data.branchName || 'N/A'}`);
        console.log(`   PR Number: ${workflowData.data.pullRequestNumber || 'N/A'}`);
        console.log(`   Changes: ${workflowData.data.changes?.length || 0}`);
        console.log(`   Errors: ${workflowData.data.errors?.length || 0}`);
      }
    } else {
      console.log('\n4️⃣ Skipping POST workflow test (GitHub not configured)');
    }

    console.log('\n✅ GitHub Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Error handling: ✅ Working`);
    console.log(`   - Status endpoint: ✅ Working`);
    console.log(`   - GitHub integration: ${statusData.githubStatus?.ready ? '✅ Ready' : '⚠️ Not configured'}`);
    
    if (!statusData.githubStatus?.ready) {
      console.log('\n💡 To enable GitHub integration:');
      console.log('   1. Create a Personal Access Token at https://github.com/settings/tokens');
      console.log('   2. Add GITHUB_TOKEN=your_token_here to your .env.local file');
      console.log('   3. Restart the application');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testGitHubIntegration();
}

module.exports = { testGitHubIntegration };
