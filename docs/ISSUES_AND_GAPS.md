# Documentation Gaps & Issues / დოკუმენტაციის ხარვეზები

This document identifies areas that need attention, clarification, or your input.

---

## 🔴 Critical Issues / კრიტიკული საკითხები

### 1. routes.ts File Size (5,038 lines)

**Problem:** Main routes file is too large and difficult to maintain.

**Location:** `server/routes.ts`

**Recommended Action:**
Split into separate route files by feature:
```
server/routes/
├── authRoutes.ts
├── childrenRoutes.ts
├── documentsRoutes.ts
├── therapyRoutes.ts
├── chatRoutes.ts
├── appointmentRoutes.ts
└── index.ts (combines all)
```

**Your Input Needed:**
- Do you want me to refactor this?
- Which features should be grouped together?

---

### 2. Duplicate Page Components

**Problem:** Some pages may be duplicates with different implementations.

| Page | Possible Duplicate | Status |
|------|-------------------|--------|
| `Research.tsx` | `ResearchFeed.tsx` | Need verification |
| `ClinicalTrials.tsx` | `TrialSearch.tsx` | Need verification |

**Your Input Needed:**
- Should `Research.tsx` be deleted or merged with `ResearchFeed.tsx`?
- Should `ClinicalTrials.tsx` be deleted or merged with `TrialSearch.tsx`?

---

### 3. AI System Documentation Missing

**Problem:** Three major AI systems lack user-facing documentation:

| System | Location | Status |
|--------|----------|--------|
| PROMETHEUS | `server/prometheus/` | No UI documentation |
| NEXUS | `server/nexusOrchestrator.ts` | No UI documentation |
| Evolution Cycles | `server/evolutionCycleEngine.ts` | Minimal documentation |

**Your Input Needed:**
- Which AI features should be exposed to users?
- Should there be a separate AI documentation page?

---

## 🟡 Medium Priority / საშუალო პრიორიტეტი

### 4. Environment Variables Not Documented

**Problem:** Many environment variables are used but not fully documented.

**Currently Known:**
```env
# Required
DATABASE_URL
SESSION_SECRET

# AI APIs
AI_INTEGRATIONS_OPENAI_API_KEY
AI_INTEGRATIONS_GEMINI_API_KEY
AI_INTEGRATIONS_ANTHROPIC_API_KEY
XAI_API_KEY

# Optional
TAVILY_API_KEY
GOOGLE_SEARCH_API_KEY
PERPLEXITY_API_KEY
RESEND_API_KEY
```

**Unknown/Undocumented:**
- Google Cloud Storage credentials
- Replit-specific variables
- Email service configuration

**Your Input Needed:**
- Can you provide complete list of required/optional variables?

---

### 5. Database Tables Without API

**Problem:** Some database tables exist but have no API endpoints.

| Table | Has API | Has UI |
|-------|---------|--------|
| `prometheusMemoryLayers` | ❌ | ❌ |
| `prometheusInsights` | ❌ | ❌ |
| `nexusDebates` | ❌ | ❌ |
| `nexusHypotheses` | ❌ | ❌ |
| `evolutionReports` | Partial | ❌ |
| `accumulatedKnowledge` | ❌ | ❌ |
| `medicalGlossary` | ❌ | ❌ |

**Your Input Needed:**
- Should these features have API/UI?
- Are these for internal use only?

---

### 6. No Error Tracking

**Problem:** No error tracking/monitoring service configured.

**Recommended:** Add Sentry or similar:
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

**Your Input Needed:**
- Do you want error tracking added?
- Which service to use?

---

## 🟢 Low Priority / დაბალი პრიორიტეტი

### 7. Missing TypeScript Types

**Locations with `any` type:**
- `server/routes.ts` - Multiple `(req as any).user` usages
- `server/aiOrchestrator.ts` - AI response types
- Various mutation handlers

**Your Input Needed:**
- Should I create proper types for these?

---

### 8. No Unit Tests

**Problem:** No unit tests exist, only E2E tests.

**Recommended:** Add tests for:
- Storage functions
- Form 100 parser
- Utility functions

**Your Input Needed:**
- Do you want unit tests added?
- Which modules to prioritize?

---

### 9. Hardcoded Values

**Found in code:**

```typescript
// In various files
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // Should be in config
const RATE_LIMIT = 10;                    // Should be configurable
const DEFAULT_PAGE_SIZE = 10;             // Should be configurable
```

**Your Input Needed:**
- Should these be moved to environment variables?

---

## 📋 Questions Requiring Your Input

### Feature Decisions

1. **Research vs ResearchFeed pages:**
   - [ ] Keep both
   - [ ] Merge into one
   - [ ] Delete Research.tsx

2. **ClinicalTrials vs TrialSearch pages:**
   - [ ] Keep both
   - [ ] Merge into one
   - [ ] Delete ClinicalTrials.tsx

3. **AI Documentation:**
   - [ ] Document all AI systems
   - [ ] Document only user-facing features
   - [ ] Skip AI documentation

### Technical Decisions

4. **Split routes.ts:**
   - [ ] Yes, split by feature
   - [ ] No, keep as is

5. **Add unit tests:**
   - [ ] Yes, add comprehensive tests
   - [ ] Yes, add basic tests
   - [ ] No, E2E is enough

6. **Add error tracking:**
   - [ ] Yes, with Sentry
   - [ ] Yes, with different service
   - [ ] No, not needed

### Documentation Decisions

7. **Language for docs:**
   - [ ] English only
   - [ ] Georgian only
   - [ ] Both languages

8. **API documentation format:**
   - [ ] Markdown (current)
   - [ ] OpenAPI/Swagger
   - [ ] Both

---

## 🔍 Code Smells Identified

### 1. Long Functions

| File | Function | Lines |
|------|----------|-------|
| `routes.ts` | Various route handlers | 50-200+ lines each |
| `aiOrchestrator.ts` | `processDocument` | 150+ lines |
| `evolutionCycleEngine.ts` | Multiple functions | 100+ lines |

### 2. Repeated Patterns

```typescript
// This pattern is repeated 50+ times in routes.ts
const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
if (!userId) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**Recommendation:** Create middleware:
```typescript
function getUserId(req: Request): string | null {
  return req.user?.claims?.sub || req.user?.id;
}
```

### 3. Inconsistent Error Handling

Some endpoints return:
```json
{ "error": "message" }
```

Others return:
```json
{ "message": "message" }
```

**Recommendation:** Standardize error responses.

---

## 📝 Next Steps

1. **Immediate:** Review this document and make decisions
2. **Short-term:** Address critical issues (routes.ts split, duplicates)
3. **Medium-term:** Add missing documentation
4. **Long-term:** Add tests, error tracking

---

**გთხოვთ მიუთითოთ რომელი საკითხები გსურთ რომ გამოვასწორო!**

Please indicate which issues you want me to address!
