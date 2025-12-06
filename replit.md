# HIE Parent Command Center

## Overview

The HIE Parent Command Center is a comprehensive medical management web application designed for parents of children with Hypoxic-Ischemic Encephalopathy (HIE). The platform provides AI-powered document analysis, therapy tracking, clinical trial matching, email communication assistance, and appointment scheduling - all within a bilingual (English/Georgian) interface. The application emphasizes trust, clarity, and accessibility while managing complex medical information in an empathetic, parent-friendly manner.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Wouter for client-side routing
- Component library based on shadcn/ui (Radix UI primitives with Tailwind CSS)
- Material Design 3 principles adapted for healthcare applications
- Responsive design with mobile-first approach (768px breakpoint)
- Theme system supporting light/dark modes with CSS variables
- Bilingual support (English/Georgian) via React Context

**State Management**:
- TanStack React Query for server state and data fetching
- React Context for global state (theme, language preferences)
- Local component state for UI interactions

**Styling System**:
- Tailwind CSS with custom design tokens
- Typography: Inter for UI, JetBrains Mono for medical data
- Spacing primitives based on Tailwind's 8px grid system
- Custom CSS variables for theme colors and shadows
- Hover and active elevation effects for interactive elements

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- Node.js HTTP server with Vite middleware in development
- RESTful API architecture (routes prefixed with `/api`)
- Session-based architecture support via express-session
- Static file serving for production builds

**Build System**:
- Vite for frontend bundling and development server
- esbuild for server-side bundling with selective dependency bundling
- Hot Module Replacement (HMR) in development
- TypeScript compilation with path aliases (`@/`, `@shared/`, `@assets/`)

**Storage Layer**:
- Interface-based storage abstraction (`IStorage`)
- In-memory storage implementation for development (`MemStorage`)
- Designed to swap with database implementations (Drizzle ORM integration planned)

### Data Storage

**Database**: PostgreSQL (configured but not yet fully integrated)
- Drizzle ORM for type-safe database queries
- Schema defined in `shared/schema.ts` with Zod validation
- Migration system via drizzle-kit
- Connection pooling with node-postgres

**Current Schema**:
- Users table with UUID primary keys
- Schema designed to be extended for child profiles, documents, therapies, appointments

**Future Storage Needs**:
- Document metadata and file references (likely cloud storage like Cloudinary)
- Medical records with OCR-extracted text
- Therapy session logs and progress notes
- Clinical trial bookmarks and eligibility matches
- Email drafts and communication history
- Calendar events and appointments

### External Dependencies

**UI Components**: shadcn/ui component library
- Radix UI primitives for accessible components
- Custom variants via class-variance-authority
- Full suite of form controls, dialogs, cards, navigation

**Design System**:
- Tailwind CSS for utility-first styling
- Custom color system with HSL values for theme support
- Google Fonts: Inter (primary), JetBrains Mono (monospace)

**Planned AI Integration** (architecture prepared but not implemented):
- OpenAI API for document analysis and chat assistance
- Medical document OCR (Tesseract.js client-side)
- PDF processing (pdf-parse)
- Image processing (Sharp)

**Planned External APIs** (routes prepared but not implemented):
- ClinicalTrials.gov API for trial matching
- PubMed E-utilities for medical research
- Google Gmail API for email management
- Google Calendar API for appointment scheduling
- SendGrid for email delivery fallback

**Development Tools**:
- Replit-specific plugins (cartographer, dev-banner, runtime-error-modal)
- TypeScript for type safety across full stack
- ESM module system throughout

### Authentication & Authorization

**Current State**: Basic user schema defined but authentication not implemented
- User model with username/password fields
- Session storage configured via connect-pg-simple
- Passport.js and passport-local dependencies installed

**Design Intent**:
- Session-based authentication (not JWT)
- User accounts tied to parent/guardian profiles
- Multi-child support per account
- Role-based access if needed for healthcare provider collaboration

### Key Architectural Decisions

**Monorepo Structure**: Single repository with shared types
- `/client` - React frontend with pages, components, contexts
- `/server` - Express backend with routes, storage, database
- `/shared` - Database schema and shared TypeScript types
- Enables type safety across API boundaries

**Component Organization**:
- `/components/ui` - Base shadcn/ui components
- `/components/dashboard` - Business logic components (cards, chat panels)
- `/components/shared` - App-wide shared components (sidebar, theme toggle)
- `/components/examples` - Isolated component examples for development

**Medical Data Focus**: Design patterns optimized for healthcare
- Progressive disclosure of complex medical information
- Sensitive handling of emotional medical contexts
- Professional aesthetic with approachable language
- Bilingual support for Georgian-speaking families

**AI-First Design**: Every major module includes AI assistance
- Document upload with automatic analysis
- Clinical trial eligibility matching
- Email drafting assistance
- Therapy recommendation insights
- Natural language query interface

**Accessibility Considerations**:
- Radix UI components provide ARIA attributes
- Keyboard navigation support
- Screen reader friendly component structure
- High contrast theme support