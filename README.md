# 🤖 AI Hack Mate

A multi-agent system that acts like a real teammate, automatically planning, coding, debugging, and managing software development tasks.

## 🚀 Features

- **Multi-Agent System**: Planner, Coder, Debugger, and PM agents working together
- **AI-Powered**: Uses Google Gemini Pro for intelligent task planning and execution
- **Real-time Updates**: Live task status updates and agent communication
- **Memory System**: Persistent context and learning from previous tasks
- **🆕 GitHub AI Workflow**: Automated repository analysis and PR creation
- **Slack Integration**: Team notifications and updates
- **Modern UI**: Clean, responsive interface with real-time updates
- **Multi-Model AI**: Support for GPT-4, Claude 3, and Gemini models
- **Advanced Analytics**: Performance tracking and cost analysis
- **Dark Mode**: Full dark mode support with system preference detection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git
- Gemini API key (optional, has fallbacks)
- GitHub token (optional, for PR creation)
- Slack bot token (optional, for notifications)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd HackMate
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start the development servers:**
```bash
# Start the integrated Next.js application
npm run dev     # Runs on port 3000 with integrated backend
```

4. **Open your browser:**
- Dashboard: http://localhost:3000
- API endpoints available at: http://localhost:3000/api/*

## 🔧 Configuration

### Environment Variables

```bash
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# GitHub Integration (optional)
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name

# Slack Integration (optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your_slack_channel_id

# Vector Database (optional)
CHROMA_URL=http://localhost:8000

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Setting up Integrations

#### GitHub Integration
1. Create a Personal Access Token with `repo` permissions
2. Set `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` in `.env`

#### Slack Integration
1. Create a Slack app and bot
2. Add bot to your channel
3. Set `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` in `.env`

#### Vector Memory with Pinecone (Recommended)
1. Create a Pinecone account at https://app.pinecone.io/
2. Create a new index:
   - Name: `hackmate-memory` (or custom name)
   - Dimensions: `768` (for Gemini embeddings)
   - Metric: `cosine`
   - Cloud: `AWS` (recommended)
3. Set `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` in `.env`

The system will automatically:
- Create the index if it doesn't exist
- Generate embeddings using Gemini
- Store and retrieve context semantically
- Fall back to in-memory storage if Pinecone is not configured

## 🎯 Usage

### Basic Workflow

1. **Enter a Problem Statement:**
   - "Add a /health endpoint to the API"
   - "Create a responsive dashboard component"
   - "Fix the failing user authentication tests"

2. **Watch the Magic:**
   - Planner Agent breaks down the problem
   - Coder Agent generates and commits code
   - Debugger Agent fixes any issues
   - PM Agent sends updates to Slack

3. **Review Results:**
   - Check the live task board
   - Review generated code in the `generated/` folder
   - See GitHub PRs created automatically
   - Get Slack notifications

### Demo Scenarios

#### Scenario 1: API Endpoint
```
Problem: "Add a /health endpoint that returns server status"
→ Planner creates tasks
→ Coder generates endpoint + tests
→ Creates GitHub PR
→ Slack notification sent
```

#### Scenario 2: UI Component
```
Problem: "Create a user profile component with avatar and bio"
→ Planner breaks down UI requirements
→ Coder generates React component with TypeScript
→ Creates styled component with Tailwind
→ PR created with preview
```

## 🏗 Architecture

### Frontend (Next.js 15+)
- **App Router**: Modern Next.js with SSR and Server Actions
- **Server Components**: SSR-first architecture with client interactivity
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Type-safe development
- **Real-time Updates**: Server Actions with automatic revalidation

### Backend (Integrated Next.js API Routes)
- **Task Runner**: Functional orchestration of agent execution
- **Memory Manager**: Handles persistent storage with ChromaDB
- **Agent System**: Functional AI agents (no classes)
- **Server Actions**: Type-safe server functions with automatic caching

### Agents
- **Planner Agent**: Problem decomposition with Gemini
- **Coder Agent**: Code generation and GitHub integration
- **Debugger Agent**: Issue analysis and fix generation
- **PM Agent**: Communication and progress tracking

### Data Flow
```
Problem Input → Planner Agent → Task Queue → Agent Execution → Results → UI Update
                     ↓
              Memory Storage ← GitHub PR ← Code Generation ← Coder Agent
                     ↓
              Slack Notification ← PM Agent ← Task Completion
```

## 📁 Project Structure

```
HackMate/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Header.tsx         # App header
│   ├── TaskBoard.tsx      # Live task board
│   ├── TaskCard.tsx       # Individual task cards
│   └── ProblemInput.tsx   # Problem input form
├── server/                # Backend server
│   ├── index.js           # Express server
│   ├── core/              # Core system
│   │   ├── TaskRunner.js  # Task orchestration
│   │   └── MemoryManager.js # Memory management
│   ├── agents/            # AI agents
│   │   ├── PlannerAgent.js
│   │   ├── CoderAgent.js
│   │   ├── DebuggerAgent.js
│   │   └── PMAgent.js
│   └── routes/            # API routes
│       └── index.js
├── generated/             # Generated code output
├── package.json           # Dependencies
└── README.md             # This file
```

## 🔌 API Endpoints

### Tasks
- `POST /api/tasks/create` - Create task from problem
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get specific task
- `POST /api/tasks/:id/retry` - Retry failed task

### Agents
- `GET /api/agents/status` - Get agent status

### Memory
- `GET /api/memory/search` - Search memory

### Health
- `GET /health` - Server health check

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:agents
npm run test:api
npm run test:ui
```

## 🚀 Deployment

### Local Production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t ai-hack-mate .
docker run -p 3000:3000 -p 3001:3001 ai-hack-mate
```

### Cloud Deployment
- Deploy frontend to Vercel/Netlify
- Deploy backend to Railway/Heroku
- Use managed ChromaDB or Pinecone

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**Agents not working:**
- Check API keys in `.env`
- Verify network connectivity
- Check server logs

**GitHub integration failing:**
- Verify token permissions
- Check repository settings
- Ensure branch protection rules allow bot commits

**Slack notifications not sending:**
- Verify bot token and channel ID
- Check bot permissions in Slack
- Ensure bot is added to the channel

### Debug Mode
```bash
DEBUG=hackmate:* npm run dev:full
```

## 🎉 Demo

Try these example problems:
- "Add a /health endpoint to check server status"
- "Create a responsive user dashboard with charts"
- "Implement JWT authentication middleware"
- "Add unit tests for the user service"
- "Fix the failing CI pipeline"

---

Built with ❤️ by the AI Hack Mate team