# Taskforce Mailer: Advanced Analytics & AI System

Welcome to the Taskforce Mailer, now evolved into a world-class professional email intelligence and productivity platform! This monorepo contains the core services, shared packages, and applications for advanced email analytics and AI-powered features.

## 🚀 Project Overview

This project transforms the existing Taskforce Mailer into a comprehensive platform with:

- **📊 Advanced Analytics**: Email volume, response times, contact health, thread analysis, forecasting
- **🤖 AI-Powered Features**: Summaries, smart replies, priority prediction, sentiment analysis, task extraction, conversational AI using OpenRouter LLMs
- **👥 Team Collaboration**: Shared dashboards, manager views, delegation, RBAC
- **⚡ Workflow Automations**: Rules engine, smart nudges, calendar integration
- **🏢 Enterprise Features**: Compliance, custom metrics, API-first design, SSO
- **📈 Reporting & Exports**: Automated reports in various formats with AI insights
- **🎨 Modern UI/UX**: Analytics dashboards and AI console built with React, Tailwind, and charting libraries

## 🏗️ Monorepo Structure

This project uses `pnpm` workspaces for a monorepo setup:

```
taskforce-mailer/
├── apps/
│   ├── desktop/          # Enhanced Electron desktop application
│   └── web/             # React web-based analytics dashboard
├── services/
│   ├── analytics-api/   # Backend API for analytics data and aggregations
│   ├── ai-service/      # Backend API for OpenRouter LLM integrations
│   └── ingestion/       # Service for email data ingestion from Gmail
├── packages/
│   ├── shared-types/    # Shared TypeScript interfaces and types
│   └── database/        # Prisma schema, migrations, and database client
├── .env.example         # Example environment variables
├── docker-compose.yml   # Docker Compose setup for local development
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── README.md           # This file
```

## ⚙️ Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis, Prisma, BullMQ (for queues)
- **Frontend**: React, Next.js, Tailwind CSS, Recharts (for charts)
- **AI Layer**: OpenRouter APIs (using `nvidia/nemotron-nano-9b-v2:free` model)
- **Desktop**: Electron, Vite
- **Containerization**: Docker, Docker Compose
- **Language**: TypeScript
- **Package Manager**: pnpm

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### 1. Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Docker & Docker Compose (optional, for local infrastructure)
- Git

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/taskforce-mailer.git
cd taskforce-mailer
```

### 3. Environment Setup

Copy the example environment file and fill in your details:

```bash
cp .env.example .env
```

**Edit `.env`** with your credentials:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string  
- `JWT_SECRET`: Strong, random secret for authentication
- `OPENROUTER_API_KEY`: Your API key from [OpenRouter](https://openrouter.ai/keys)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Gmail API credentials
- `CONSENT_CONTENT`: Set to `true` to enable AI features that process email content

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Start Infrastructure (Optional)

If using Docker for local development:

```bash
pnpm docker:up
```

This starts PostgreSQL and Redis. Verify with `docker-compose ps`.

### 6. Database Setup

Apply the Prisma schema to your database:

```bash
pnpm db:migrate
```

Build shared packages:

```bash
pnpm --filter @taskforce/shared-types build
pnpm --filter @taskforce/database generate
```

### 7. Start Services

Start all services in development mode:

```bash
pnpm services:dev
```

This runs:
- Analytics API (port 4000)
- AI Service (port 4001) 
- Ingestion Service (port 4002)

### 8. Start Web Dashboard

In a new terminal:

```bash
pnpm --filter @taskforce/web dev
```

Visit `http://localhost:3000` to see the analytics dashboard.

### 9. Start Desktop App (Optional)

In another terminal:

```bash
pnpm desktop:dev
```

### 10. Verify Everything Works

Check service health:

```bash
pnpm health
```

You should see `status: 'ok'` for all services.

## 🧪 Testing

Run tests for all packages:

```bash
pnpm test
```

## 📊 Features Overview

### Analytics Dashboard
- **Overview**: Key metrics, trends, and AI insights
- **Email Analytics**: Volume trends, response times, engagement metrics
- **Contact Management**: Top contacts, health scores, relationship tracking
- **Thread Analysis**: Conversation patterns, resolution tracking
- **AI Console**: Natural language queries about your email data

### AI-Powered Features
- **Smart Summaries**: AI-generated thread and email summaries
- **Priority Classification**: Automatic email priority scoring
- **Sentiment Analysis**: Tone analysis of email communications
- **Task Extraction**: Identify actionable items from emails
- **Natural Language Queries**: Ask questions about your data in plain English
- **Smart Replies**: AI-suggested response drafts

### Email Ingestion
- **Gmail Integration**: Full Gmail API integration with OAuth
- **Background Sync**: Automated email synchronization
- **Real-time Updates**: Webhook-based real-time email processing
- **Data Encryption**: Secure storage of email credentials

### Team Features
- **Multi-tenant Architecture**: Organization-based data isolation
- **Role-based Access**: VIEWER, ANALYST, MANAGER, ADMIN roles
- **Shared Dashboards**: Team-wide analytics and insights
- **Manager Views**: Team performance monitoring

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Start all services in development
pnpm services:dev

# Start web dashboard
pnpm --filter @taskforce/web dev

# Start desktop app
pnpm desktop:dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Database operations
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Prisma Studio
pnpm db:seed       # Seed database

# Docker operations
pnpm docker:up     # Start infrastructure
pnpm docker:down   # Stop infrastructure
pnpm docker:logs   # View logs

# Health checks
pnpm health        # Check all services
```

## 🏗️ Architecture

### Backend Services

**Analytics API** (`services/analytics-api/`)
- RESTful API for email analytics data
- Real-time metrics and aggregations
- Multi-tenant data isolation
- JWT-based authentication

**AI Service** (`services/ai-service/`)
- OpenRouter LLM integration
- AI feature processing (summaries, sentiment, etc.)
- Request tracking and cost monitoring
- Content consent management

**Ingestion Service** (`services/ingestion/`)
- Gmail API integration
- Background job processing with BullMQ
- Email synchronization and processing
- Token refresh and error handling

### Frontend Applications

**Web Dashboard** (`apps/web/`)
- Next.js React application
- Analytics dashboards with Recharts
- AI console for natural language queries
- Responsive design with Tailwind CSS

**Desktop App** (`apps/desktop/`)
- Enhanced Electron application
- Integrated with analytics services
- Offline capabilities
- Native desktop features

### Shared Packages

**Database** (`packages/database/`)
- Prisma schema and migrations
- Database client generation
- Multi-tenant data models

**Shared Types** (`packages/shared-types/`)
- TypeScript interfaces
- Common data types
- API response schemas

## 🔐 Security & Privacy

- **Data Encryption**: Sensitive data encrypted at rest
- **JWT Authentication**: Secure API authentication
- **Content Consent**: Explicit consent for AI processing
- **Multi-tenant Isolation**: Organization-based data separation
- **Rate Limiting**: API rate limiting and abuse prevention

## 🤝 Contributing

Contributions are welcome! Please refer to the development guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the API documentation in each service

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Monorepo setup with pnpm workspaces
- [x] PostgreSQL + Redis infrastructure
- [x] Prisma database schema
- [x] OpenRouter AI integration

### Phase 2: Core Services ✅
- [x] Email ingestion service (Gmail)
- [x] Analytics API with core endpoints
- [x] AI service with LLM integrations

### Phase 3: Frontend (In Progress)
- [x] React web dashboard
- [x] Analytics overview and charts
- [x] AI console with natural language queries
- [ ] Desktop app integration
- [ ] Advanced analytics features

### Phase 4: Advanced Features (Planned)
- [ ] Outlook integration
- [ ] Advanced AI features (smart replies, task extraction)
- [ ] Team collaboration features
- [ ] Workflow automations
- [ ] Enterprise features (SSO, compliance)

### Phase 5: Scale & Polish (Planned)
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Deployment guides
- [ ] Monitoring and observability

---

**Built with ❤️ using TypeScript, React, Node.js, and AI**