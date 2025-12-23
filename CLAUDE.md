# HIE Parent Command Center - AI Assistant Guide

This document provides essential context for AI assistants working with this codebase.

## Project Overview

**Purpose:** A comprehensive AI-powered medical management web application for parents of children with Hypoxic-Ischemic Encephalopathy (HIE). The platform provides document analysis, therapy tracking, clinical trial matching, email assistance, and appointment scheduling.

**Target Users:** Parents and guardians managing children with HIE conditions

**Key Features:**
- Medical document upload and AI analysis
- Child profile management with medical history
- Therapy tracking and progress monitoring
- Clinical trial eligibility matching
- Email composition assistance with AI
- Appointment calendar management
- Multi-AI research system (NEXUS OMEGA) for neuroregeneration research
- Bilingual interface (English/Georgian)

## Tech Stack

### Frontend
- **Framework:** React 18.3 + TypeScript 5.6
- **Routing:** Wouter (lightweight client-side router)
- **State Management:** TanStack React Query (server state), React Context (global state)
- **UI Components:** shadcn/ui (built on Radix UI primitives)
- **Styling:** Tailwind CSS 3.4 with CSS variables for theming
- **Build Tool:** Vite 5.4
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **File Upload:** Uppy with AWS S3 support

### Backend
- **Server:** Express.js 4.21 + TypeScript
- **Database:** PostgreSQL 16 via Drizzle ORM 0.39
- **Validation:** Zod schemas with drizzle-zod integration
- **Authentication:** Passport.js (session-based)
- **File Processing:** pdf-parse (extraction), PDFKit (generation)

### AI Integrations
- **Anthropic Claude:** `@anthropic-ai/sdk`
- **OpenAI GPT:** `openai`
- **Google Gemini:** `@google/genai`
- **Academic APIs:** OpenAlex, Semantic Scholar

## Project Structure

```
/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # 50+ shadcn/ui base components
│   │   │   ├── dashboard/    # Business logic components
│   │   │   ├── nexus/        # NEXUS research system components
│   │   │   └── shared/       # App-wide components (sidebar, toggles)
│   │   ├── pages/            # 13 page components
│   │   ├── contexts/         # ThemeContext, LanguageContext
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities (queryClient, utils)
│   │   ├── App.tsx           # Main router
│   │   └── main.tsx          # Entry point
│   └── index.html
│
├── server/                    # Express backend
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # All API endpoints (~50 routes)
│   ├── storage.ts            # Database abstraction layer (IStorage)
│   ├── db.ts                 # Database connection
│   ├── evolutionCycleEngine.ts  # Autonomous research logic
│   ├── nexusOrchestrator.ts     # Multi-AI coordination
│   ├── aiOrchestrator.ts        # AI document analysis
│   ├── documentProcessor.ts     # PDF/image processing
│   ├── academicSearch.ts        # Academic API integration
│   └── pdfGenerator.ts          # PDF report generation
│
├── shared/                    # Shared code
│   └── schema.ts             # Drizzle ORM schema + Zod types (18+ tables)
│
├── script/
│   └── build.ts              # Custom build script
│
└── Configuration
    ├── package.json
    ├── tsconfig.json         # Path aliases: @/ -> client/src, @shared/ -> shared
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── drizzle.config.ts
    └── components.json       # shadcn/ui config
```

## Development Commands

```bash
npm run dev       # Start dev server (port 5000)
npm run build     # Build for production
npm run start     # Start production server
npm run check     # TypeScript type checking
npm run db:push   # Apply database migrations
```

## Path Aliases

Configure in `tsconfig.json`:
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

## Key Patterns and Conventions

### Component Architecture
- **Functional components only** with React hooks
- **TypeScript interfaces** for all props
- **Custom hooks** for reusable logic (e.g., `useAuth`, `useToast`)
- **Context providers** for global state (Theme, Language)
- **Skeleton loading states** instead of spinners

### Data Fetching
```typescript
// Use TanStack Query for all API calls
const { data, isLoading, error } = useQuery<Type[]>({
  queryKey: ['/api/endpoint']
});

// Mutations with invalidation
const mutation = useMutation({
  mutationFn: (data) => apiRequest('POST', '/api/endpoint', data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/endpoint'] })
});
```

### API Routes
- All routes prefixed with `/api/`
- RESTful conventions: GET (list/read), POST (create), PUT (update), DELETE (remove)
- Zod validation for request bodies
- Response format: JSON with proper error codes

### Styling Guidelines
- **Tailwind utility classes** for all styling
- **CSS variables** for theming (HSL color system in `:root`)
- **Responsive breakpoints:** 768px (tablet), 1024px (desktop)
- **Component shadows:** `shadow-sm` for cards
- **Rounded corners:** `rounded-lg` standard
- **Dark mode:** Theme toggle via `ThemeContext`

### File Naming
- **Components:** PascalCase (e.g., `ChildProfile.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utils:** camelCase (e.g., `queryClient.ts`)
- **Types:** PascalCase, co-located in `shared/schema.ts`

### Database Schema
Located in `shared/schema.ts`. Key tables:
- `users`, `children`, `documents`, `therapies`, `therapySessions`
- `appointments`, `emails`, `conversations`, `chatMessages`
- `nexusAiAgents`, `nexusResearchQueries`, `nexusFindings`, `nexusHypotheses`
- `evolutionCycles`, `evolutionDailyRuns`, `evolutionInsights`
- `accumulatedKnowledge`

All schemas have corresponding Zod validation schemas (e.g., `insertChildSchema`).

### Internationalization
- Bilingual: English (`en`) and Georgian (`ka`)
- Translations in `client/src/contexts/LanguageContext.tsx` (350+ keys)
- Use `useLanguage()` hook: `const { t, language, setLanguage } = useLanguage()`
- Access translations: `t('dashboard.title')`

## Important Files for Reference

| File | Purpose |
|------|---------|
| `shared/schema.ts` | All database schemas and types |
| `server/routes.ts` | All API endpoints |
| `server/storage.ts` | Database operations interface |
| `client/src/App.tsx` | Application routing |
| `client/src/contexts/LanguageContext.tsx` | Translations |
| `design_guidelines.md` | UI/UX design patterns |

## Common Tasks

### Adding a New API Endpoint
1. Define route in `server/routes.ts`
2. Add storage method in `server/storage.ts` (interface + implementation)
3. If needed, add schema in `shared/schema.ts`
4. Call from frontend using `useQuery` or `useMutation`

### Adding a New Page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Add navigation link in `client/src/components/shared/AppSidebar.tsx`
4. Add translations in `LanguageContext.tsx`

### Adding a UI Component
1. For shadcn components: check `client/src/components/ui/`
2. For business components: add to `client/src/components/dashboard/`
3. Follow existing patterns with TypeScript interfaces

### Database Changes
1. Modify schema in `shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Update storage interface and implementation

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- AI API keys (as needed):
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
  - `GOOGLE_AI_API_KEY`

## Design Principles

From `design_guidelines.md`:
1. **Trust Through Clarity:** Professional medical aesthetic
2. **Cognitive Load Management:** Progressive disclosure
3. **Empathetic Design:** Sensitive to emotional context
4. **Bilingual Harmony:** Seamless language switching

### UI Specifics
- **Font:** Inter (body), JetBrains Mono (medical data)
- **Cards:** `shadow-sm`, `rounded-lg`, `p-6`
- **Spacing:** Tailwind units 2, 4, 6, 8, 12, 16
- **Grid:** 12-column responsive, `gap-6` for cards
- **Animations:** Minimal, purposeful (skeleton loaders, subtle hovers)

## Known Issues

See `DIAGNOSTICS_ACTION_PLAN.md` for:
- TypeScript errors (10) to address
- Security vulnerabilities (9) requiring dependency updates
- Bundle optimization opportunities

## Testing

No formal test suite currently. Validate changes by:
1. Running `npm run check` for TypeScript errors
2. Manual testing in development mode
3. Checking browser console for runtime errors

## Git Workflow

- Feature branches from main
- Descriptive commit messages
- PR reviews before merging

## Security Considerations

- Session-based authentication via Passport.js
- Zod validation on all inputs
- File upload validation (type, size)
- No sensitive data in client-side code
- Environment variables for secrets
