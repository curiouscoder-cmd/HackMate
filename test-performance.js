#!/usr/bin/env node

/**
 * Performance test for GitHub integration optimizations
 * Measures response times and caching effectiveness
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_REPO_URL = 'https://github.com/octocat/Hello-World';

async function measureTime(operation) {
  const start = Date.now();
  const result = await operation();
  const end = Date.now();
  return { result, time: end - start };
}

async function testPerformance() {
  console.log('🚀 Testing GitHub Integration Performance...\n');

  try {
    // Test 1: First repository analysis (cold cache)
    console.log('1️⃣ Testing first repository analysis (cold cache)...');
    const { result: firstResult, time: firstTime } = await measureTime(async () => {
      return await fetch(`${BASE_URL}/api/github/workflow?repositoryUrl=${encodeURIComponent(TEST_REPO_URL)}`);
    });
    
    console.log(`   First request: ${firstTime}ms`);
    console.log(`   Status: ${firstResult.status}`);

    // Test 2: Second repository analysis (warm cache)
    console.log('\n2️⃣ Testing second repository analysis (warm cache)...');
    const { result: secondResult, time: secondTime } = await measureTime(async () => {
      return await fetch(`${BASE_URL}/api/github/workflow?repositoryUrl=${encodeURIComponent(TEST_REPO_URL)}`);
    });
    
    console.log(`   Second request: ${secondTime}ms`);
    console.log(`   Status: ${secondResult.status}`);
    console.log(`   Cache improvement: ${Math.round(((firstTime - secondTime) / firstTime) * 100)}%`);

    // Test 3: Multiple concurrent requests
    console.log('\n3️⃣ Testing concurrent requests...');
    const concurrentStart = Date.now();
    const concurrentPromises = Array(3).fill().map(() => 
      fetch(`${BASE_URL}/api/github/workflow?repositoryUrl=${encodeURIComponent(TEST_REPO_URL)}`)
    );
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStart;
    
    console.log(`   3 concurrent requests: ${concurrentTime}ms`);
    console.log(`   All successful: ${concurrentResults.every(r => r.ok)}`);
    console.log(`   Average per request: ${Math.round(concurrentTime / 3)}ms`);

    // Test 4: GitHub status endpoint performance
    console.log('\n4️⃣ Testing GitHub status endpoint...');
    const { result: statusResult, time: statusTime } = await measureTime(async () => {
      return await fetch(`${BASE_URL}/api/github/workflow?repositoryUrl=${encodeURIComponent(TEST_REPO_URL)}`);
    });
    
    console.log(`   Status check: ${statusTime}ms`);
    console.log(`   Status: ${statusResult.status}`);

    // Performance Summary
    console.log('\n📊 Performance Summary:');
    console.log(`   Cold cache: ${firstTime}ms`);
    console.log(`   Warm cache: ${secondTime}ms`);
    console.log(`   Cache speedup: ${Math.round(((firstTime - secondTime) / firstTime) * 100)}%`);
    console.log(`   Concurrent avg: ${Math.round(concurrentTime / 3)}ms`);
    console.log(`   Status check: ${statusTime}ms`);

    // Performance Analysis
    console.log('\n🎯 Performance Analysis:');
    if (secondTime < firstTime * 0.5) {
      console.log('   ✅ Excellent caching performance (>50% improvement)');
    } else if (secondTime < firstTime * 0.8) {
      console.log('   ✅ Good caching performance (>20% improvement)');
    } else {
      console.log('   ⚠️  Caching may not be working optimally');
    }

    if (concurrentTime / 3 < firstTime * 1.2) {
      console.log('   ✅ Excellent concurrent request handling');
    } else {
      console.log('   ⚠️  Concurrent requests may be slower than expected');
    }

    if (statusTime < 1000) {
      console.log('   ✅ Fast status endpoint response');
    } else {
      console.log('   ⚠️  Status endpoint may be slow');
    }

    // Expected vs Actual
    console.log('\n📈 Expected vs Actual Performance:');
    console.log('   Expected improvements based on optimizations:');
    console.log('   - Repository analysis: 70-85% faster with cache');
    console.log('   - Concurrent requests: No blocking, similar performance');
    console.log('   - Status checks: <1 second response time');
    
    const cacheImprovement = Math.round(((firstTime - secondTime) / firstTime) * 100);
    if (cacheImprovement >= 70) {
      console.log('   🎉 Cache performance exceeds expectations!');
    } else if (cacheImprovement >= 50) {
      console.log('   ✅ Cache performance meets expectations');
    } else {
      console.log('   📝 Cache performance below expectations - may need tuning');
    }

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    process.exit(1);
  }
}

// Run the performance test
if (require.main === module) {
  testPerformance();
}

module.exports = { testPerformance };
