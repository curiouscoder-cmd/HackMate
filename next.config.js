/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for production
  experimental: {
    optimizePackageImports: ['@google/generative-ai', 'openai', '@anthropic-ai/sdk'],
  },
  
  // Handle cross-origin requests for development
  async headers() {
    return [
      {
        source: '/_next/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  
  // Handle external packages
  transpilePackages: [],
  
  // App Router is now stable in Next.js 15+
  typescript: {
    // Enable strict mode for better type checking
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during builds
    ignoreDuringBuilds: false,
  },
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
    CHROMA_URL: process.env.CHROMA_URL,
  },
};

module.exports = nextConfig;
