# Documentation Gaps & Issues / დოკუმენტაციის ხარვეზები

This document identifies areas that need attention, clarification, or your input.

---

## 🔴 Critical Issues / კრიტიკული საკითხები

### 1. routes.ts File Size (5,038 lines)

**Status:** ✅ PARTIALLY RESOLVED

Extracted ~615 lines into modular route files:
```
server/routes/
├── childrenRoutes.ts    ✅ Created
├── documentRoutes.ts    ✅ Created
├── therapyRoutes.ts     ✅ Created
├── appointmentRoutes.ts ✅ Created
├── emailRoutes.ts       ✅ Created
└── index.ts             ✅ Created (combines all)
```

**Remaining:** Main routes.ts still large. Consider extracting more modules (auth, chat, AI routes).

---

### 2. Duplicate Page Components

**Status:** ✅ RESOLVED

Analysis found these are NOT duplicates - they have different functionality:

| Page | Purpose | Route |
|------|---------|-------|
| `Research.tsx` | Manual PubMed article search | `/pubmed` |
| `ResearchFeed.tsx` | Automated research monitoring | `/research` |
| `ClinicalTrials.tsx` | Eligibility-matched trials dashboard | `/trials` |
| `TrialSearch.tsx` | Trial search with filters | `/search` |

All 4 pages preserved with proper navigation.

---

### 3. AI System Documentation Missing

**Status:** ✅ RESOLVED

Created comprehensive AI documentation:
- `docs/AI_SYSTEMS.md` - Full documentation for NEXUS, EVOLUTION, PROMETHEUS
- Added NEXUS page (`/nexus`) with debates and hypotheses UI
- All AI systems now accessible via navigation sidebar

---

## 🟡 Medium Priority / საშუალო პრიორიტეტი

### 4. Environment Variables Not Documented

**Status:** ✅ RESOLVED

Created comprehensive documentation:
- `docs/ENV_VARIABLES.md` - Full documentation with all 30+ environment variables
- `.env.example` - Updated template with all variables
- Includes instructions for obtaining API keys
- Security recommendations included

---

### 5. Database Tables Without API

**Status:** ✅ RESOLVED

All major tables now have API endpoints:

| Table | Has API | Has UI |
|-------|---------|--------|
| `prometheusMemory` | ✅ `/api/prometheus/*` | ✅ PROMETHEUS page |
| `prometheusInsights` | ✅ `/api/prometheus/insights` | ✅ |
| `nexusDebates` | ✅ `/api/nexus/debates` | ✅ NEXUS page |
| `nexusHypotheses` | ✅ `/api/nexus/hypotheses` | ✅ |
| `evolutionReports` | ✅ `/api/evolution/reports` | ✅ Evolution page |
| `accumulatedKnowledge` | ✅ `/api/evolution/accumulated-knowledge` | ✅ |
| `medicalGlossary` | ✅ `/api/trials/glossary` | ✅ Glossary page |

---

### 6. No Error Tracking

**Status:** ✅ RESOLVED

Sentry integration added:
- `server/sentry.ts` - Centralized Sentry integration module
- Error handler updated to capture 500 errors
- Environment variable: `SENTRY_DSN`
- Includes user context, breadcrumbs, and sensitive data filtering

---

## 🟢 Low Priority / დაბალი პრიორიტეტი

### 7. Missing TypeScript Types

**Status:** ✅ PARTIALLY RESOLVED

Created type infrastructure:
- `server/types/express.ts` - AuthenticatedRequest, getUserId() helper
- `server/types/index.ts` - Central export point
- Modular routes updated to use proper types (childrenRoutes.ts, etc.)

**Remaining:** Main routes.ts still has many `(req as any).user` usages - requires incremental refactoring.

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

**Status:** ✅ RESOLVED

Created `server/config.ts` with configurable values:
- File upload sizes (MAX_DOCUMENT_SIZE, MAX_IMAGE_SIZE, etc.)
- Pagination (DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
- Rate limiting (RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS)
- Cache TTLs (SEARCH_CACHE_TTL, TRIAL_CACHE_TTL)
- AI settings (AI_MAX_TOKENS, AI_TIMEOUT)

All values can be overridden via environment variables.

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
