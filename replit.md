# Trial Navigator

## Overview

Trial Navigator is a unified clinical trial search platform that aggregates data from international registries, provides AI-powered translation to 40+ languages (with focus on Georgian and other underserved languages), and offers intelligent trial matching. The platform transforms complex clinical trial information into accessible, multilingual content.

**Key Features**:
- Search across clinical trials from ClinicalTrials.gov (and architecture for 10+ registries)
- AI-powered translation to Georgian and 40+ languages
- PROMETHEUS-MIND cognitive evolution system for advanced insights
- Public access to search and trial details (no login required)
- Saved trials and preferences for authenticated users

## User Preferences

Preferred communication style: Simple, everyday language.
Primary languages: Georgian (ქართული) and English.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Wouter for client-side routing
- Component library based on shadcn/ui (Radix UI primitives with Tailwind CSS)
- Responsive design with mobile-first approach (768px breakpoint)
- Theme system supporting light/dark modes with CSS variables
- Bilingual support (English/Georgian) via React Context

**State Management**:
- TanStack React Query for server state and data fetching
- React Context for global state (theme, language preferences)
- Local component state for UI interactions

**Trial Navigator Pages**:
- `/` - Landing page with search hero
- `/search?q={query}` - Trial search results with filters (public)
- `/trial/:id` - Trial detail with translations (public, supports NCT numbers)
- `/prometheus` - PROMETHEUS-MIND cognitive system (authenticated)
- `/dashboard` - User dashboard with saved trials (authenticated)

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- Node.js HTTP server with Vite middleware in development
- RESTful API architecture (routes prefixed with `/api`)
- Email/password authentication with bcrypt hashing and PostgreSQL session store
- Static file serving for production builds

**Authentication System**:
- Email/password registration and login (no Replit account required)
- Bcrypt password hashing with 10 salt rounds
- Session regeneration on login/register for security
- PostgreSQL-backed session store
- Routes: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/user

**Trial API Endpoints**:
- `GET /api/trials/search?q={query}&phase={phase}&status={status}` - Search trials
- `GET /api/trials/:id` - Get trial by numeric ID
- `GET /api/trials/nct/:nctNumber` - Get trial by NCT number
- `POST /api/trials/:id/translate` - Translate trial to target language

### Data Storage

**Database**: PostgreSQL with Drizzle ORM
- Clinical trials table with JSONB for locations and eligibility
- Translations table for caching AI translations
- Trial sources for registry tracking
- Saved trials for user bookmarks

**Clinical Trial Schema**:
```typescript
clinicalTrials: {
  id: serial primary key,
  nctNumber: varchar unique,
  titleEn: text,
  briefSummaryEn: text,
  phase: varchar,
  status: varchar,
  sponsorName: varchar,
  locations: jsonb,
  eligibilityCriteria: jsonb,
  gender: varchar,
  minimumAge: varchar,
  maximumAge: varchar,
  startDate: date,
  completionDate: date,
}
```

### Trial Aggregation Service

**Location**: `server/services/trialAggregator.ts`
- Fetches from ClinicalTrials.gov API v2 when local database is empty
- Deduplication by NCT number
- Caching with configurable TTL
- Architecture prepared for additional registries (EU CTR, WHO ICTRP)

### Translation Service

**Location**: `server/services/trialTranslator.ts`
- AI-powered translation using OpenAI GPT-4o
- Medical terminology preservation
- Translation caching in database
- Supports 40+ languages with Georgian focus

### Key Architectural Decisions

**Monorepo Structure**: Single repository with shared types
- `/client` - React frontend with pages, components, contexts
- `/server` - Express backend with routes, storage, services
- `/shared` - Database schema and shared TypeScript types

**Component Organization**:
- `/components/ui` - Base shadcn/ui components
- `/components/shared` - App-wide shared components (sidebar, theme toggle)
- `/pages` - Route components (Landing, TrialSearch, TrialDetail)

**Public vs Authenticated Routes**:
- Public: `/`, `/search`, `/trial/:id` - No login required
- Authenticated: `/dashboard`, `/prometheus`, `/saved-trials`

### External Dependencies

**API Integrations**:
- ClinicalTrials.gov API v2 - Trial data source
- OpenAI API - Translation and PROMETHEUS insights
- Anthropic API - Multi-AI consensus (PROMETHEUS)
- Google Gemini API - Multi-AI consensus (PROMETHEUS)

**UI Components**: shadcn/ui component library
- Radix UI primitives for accessible components
- Lucide React for icons
- TailwindCSS for styling

### Recent Changes (January 2026)

- Transformed from HIE Parent Command Center to Trial Navigator
- Added public routing for search and trial detail pages
- Implemented ClinicalTrials.gov API auto-fetch when database empty
- NCT number detection for proper API routing in trial detail
- PROMETHEUS-MIND system retained and integrated
- Updated navigation with Trial Navigator branding
