# Trial Navigator / კვლევის ნავიგატორი

> Georgian Medical Research Platform for Clinical Trial Discovery and Patient Management

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.16-336791.svg)](https://www.postgresql.org/)

## Overview / მიმოხილვა

Trial Navigator არის სამედიცინო კვლევის პლატფორმა ქართველი პაციენტებისთვის, რომელიც:

- **ფორმა 100-ის დამუშავება** - ქართული სამედიცინო დოკუმენტის ავტომატური წაკითხვა
- **კლინიკური კვლევების ძიება** - ClinicalTrials.gov-ის ინტეგრაცია
- **AI ასისტენტი** - მრავალენოვანი ხელოვნური ინტელექტი
- **კვლევის მონიტორინგი** - ავტომატური სამეცნიერო სტატიების ძიება

---

## Tech Stack / ტექნოლოგიები

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| Vite | 5.4.21 | Build Tool |
| Wouter | 3.3.5 | Routing |
| TanStack Query | 5.60.5 | Server State |
| Radix UI | Latest | Component Library |
| Tailwind CSS | 3.4.17 | Styling |
| Framer Motion | 11.13.1 | Animations |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.21.2 | API Framework |
| Drizzle ORM | 0.39.3 | Database ORM |
| PostgreSQL | 8.16+ | Database |
| Passport.js | 0.7.0 | Authentication |
| Zod | 3.24.2 | Validation |

### AI & External APIs
- OpenAI GPT-4
- Google Gemini
- Anthropic Claude
- ClinicalTrials.gov API v2
- PubMed E-utilities
- OpenFDA API

---

## Project Structure / პროექტის სტრუქტურა

```
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/          # UI კომპონენტები
│   │   │   ├── ui/              # Base components (40+)
│   │   │   ├── dashboard/       # Dashboard widgets
│   │   │   ├── nexus/           # NEXUS AI components
│   │   │   ├── prometheus/      # Prometheus memory UI
│   │   │   └── therapy/         # Therapy management
│   │   ├── pages/               # Page components (24)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── contexts/            # Theme, Language contexts
│   │   └── lib/                 # Utilities
│   └── index.html
│
├── server/                      # Express Backend
│   ├── routes.ts                # Main API routes (5000+ lines)
│   ├── trialRoutes.ts           # Clinical trials API
│   ├── patientProfileRoutes.ts  # Patient management
│   ├── emailAuth.ts             # Authentication
│   ├── db.ts                    # Database connection
│   ├── storage.ts               # Data access layer
│   ├── prometheus/              # AI memory system
│   ├── services/                # External API services
│   │   ├── clinicalTrialsApi.ts # ClinicalTrials.gov
│   │   ├── pubmedApi.ts         # PubMed search
│   │   ├── openfdaApi.ts        # FDA data
│   │   └── form100Parser.ts     # Georgian form parser
│   └── index.ts                 # Server entry point
│
├── shared/                      # Shared Code
│   └── schema.ts                # Database schema (40+ tables)
│
├── drizzle/                     # Database migrations
├── docs/                        # Documentation
└── e2e/                         # E2E tests (Playwright)
```

---

## Quick Start / სწრაფი დაწყება

### Prerequisites / წინაპირობები

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### Installation / ინსტალაცია

```bash
# Clone repository
git clone https://github.com/navyforses/Agent-Command-Center.git
cd Agent-Command-Center

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables / გარემოს ცვლადები

```env
# Required / აუცილებელი
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SESSION_SECRET=your-secret-key

# AI APIs (at least one required)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_GEMINI_API_KEY=...
AI_INTEGRATIONS_ANTHROPIC_API_KEY=...

# Optional / არასავალდებულო
RESEND_API_KEY=...           # Email service
TAVILY_API_KEY=...           # Web search
PORT=5000                    # Server port
```

---

## Key Features / ძირითადი ფუნქციები

### 1. Form 100 Processing / ფორმა 100-ის დამუშავება

ქართული სამედიცინო დოკუმენტის ავტომატური წაკითხვა AI-ით:

```typescript
// Upload endpoint
POST /api/patient-profile/upload-form100

// Extracted data
{
  fullName: "სახელი გვარი",
  birthDate: "1990-01-01",
  diagnosis: "დიაგნოზი",
  icd10Codes: ["G80.0", "P91.6"],
  attendingPhysician: "ექიმის სახელი",
  medicalInstitution: "კლინიკა"
}
```

### 2. Clinical Trial Search / კვლევების ძიება

```typescript
// Search trials
GET /api/trials/search?query=cerebral+palsy&status=RECRUITING

// Save trial
POST /api/trials/save
{ nctId: "NCT12345678" }

// Get saved trials
GET /api/trials/saved
```

### 3. Research Monitoring / კვლევის მონიტორინგი

```typescript
// Enable monitoring
POST /api/research-monitor/enable

// Get findings
GET /api/research-findings
```

### 4. AI Chat / AI ჩატი

```typescript
// Chat with AI
POST /api/chat
{
  messages: [{ role: "user", content: "What treatments exist for HIE?" }],
  conversationId: "uuid"
}
```

---

## API Reference / API დოკუმენტაცია

### Authentication / ავთენტიფიკაცია

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login with email/password |
| `/api/logout` | GET | Logout current session |
| `/api/auth/user` | GET | Get current user |

### Patient Profile / პაციენტის პროფილი

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patient-profile` | GET | Get patient profile |
| `/api/patient-profile` | PUT | Update profile |
| `/api/patient-profile/upload-form100` | POST | Upload Form 100 |

### Clinical Trials / კლინიკური კვლევები

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trials/search` | GET | Search clinical trials |
| `/api/trials/:nctId` | GET | Get trial details |
| `/api/trials/saved` | GET | Get saved trials |
| `/api/trials/save` | POST | Save a trial |

### Documents / დოკუმენტები

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET | List documents |
| `/api/documents` | POST | Upload document |
| `/api/documents/:id/analyze` | POST | Analyze with AI |

### Children / ბავშვები

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/children` | GET | List children |
| `/api/children` | POST | Create child |
| `/api/children/:id` | GET | Get child details |
| `/api/children/:id` | PATCH | Update child |

### Therapies / თერაპიები

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/therapies` | GET | List therapies |
| `/api/therapies` | POST | Create therapy |
| `/api/therapies/:id/sessions` | GET | Get therapy sessions |
| `/api/therapies/:id/sessions` | POST | Log session |

---

## Database Schema / მონაცემთა ბაზის სქემა

### Core Tables / ძირითადი ცხრილები

```
users                    # მომხმარებლები
├── id (UUID)
├── email
├── passwordHash
├── firstName, lastName
└── authProvider

children                 # ბავშვები (პაციენტები)
├── userId → users.id
├── firstName, lastName
├── dateOfBirth
└── diagnosis

patientProfiles          # პაციენტის პროფილი (Form 100)
├── userId → users.id
├── fullName, birthDate
├── primaryDiagnosis
├── icd10Codes[]
└── extractionConfidence

documents                # დოკუმენტები
├── userId → users.id
├── childId → children.id
├── documentType
├── filePath
└── aiSummary

therapies               # თერაპიები
├── childId → children.id
├── therapyType
├── frequency
└── goals[]

clinicalTrials          # კლინიკური კვლევები
├── nctId (PK)
├── title
├── conditions[]
└── phases[]
```

### AI System Tables / AI სისტემის ცხრილები

```
prometheusMemoryLayers   # Prometheus მეხსიერება
nexusResearchQueries     # NEXUS კვლევის მოთხოვნები
evolutionCycles          # Evolution ციკლები
researchFindings         # კვლევის აღმოჩენები
```

---

## Scripts / სკრიპტები

```bash
# Development
npm run dev              # Start dev server (port 5000)

# Build
npm run build            # Build for production

# Production
npm run start            # Start production server

# Database
npm run db:push          # Push schema to database

# Type Checking
npm run check            # TypeScript type check

# Testing
npm run test:e2e         # Run Playwright tests
npm run test:e2e:ui      # Run tests with UI
```

---

## Deployment / დეპლოიმენტი

### Replit (Recommended)

1. Fork repository to Replit
2. Set environment variables in Secrets
3. Click "Run"

### Docker

```bash
docker-compose up -d
```

### Traditional

```bash
npm run build
npm run start
```

---

## Architecture Diagrams / არქიტექტურის დიაგრამები

### Request Flow / მოთხოვნის ნაკადი

```
[Client] → [Vite Dev Server] → [Express API] → [PostgreSQL]
                                    ↓
                           [External APIs]
                           - ClinicalTrials.gov
                           - PubMed
                           - OpenAI/Gemini
```

### Authentication Flow / ავთენტიფიკაციის ნაკადი

```
[Login Form] → POST /api/auth/login
                     ↓
            [Passport.js Verify]
                     ↓
            [Create Session]
                     ↓
            [Set Cookie: connect.sid]
                     ↓
            [Return User Data]
```

---

## Contributing / წვლილის შეტანა

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

### Quick Guide

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push to branch: `git push origin feature/my-feature`
5. Open Pull Request

---

## Support / მხარდაჭერა

- **Issues:** [GitHub Issues](https://github.com/navyforses/Agent-Command-Center/issues)
- **Email:** support@lookingforlife.com

---

## License / ლიცენზია

MIT License - See [LICENSE](LICENSE) for details.

---

## Acknowledgments / მადლობა

- ClinicalTrials.gov API
- PubMed/NCBI
- OpenFDA
- OpenAI, Google, Anthropic
