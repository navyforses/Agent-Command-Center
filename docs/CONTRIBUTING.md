# Contributing Guide / წვლილის შეტანის სახელმძღვანელო

Welcome to Trial Navigator! This guide will help you get started with contributing to the project.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Architecture](#project-architecture)
3. [Code Style](#code-style)
4. [Making Changes](#making-changes)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Common Tasks](#common-tasks)

---

## Development Setup

### Prerequisites

- **Node.js** 20 or higher
- **PostgreSQL** 14 or higher
- **Git**
- Code editor (VS Code recommended)

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/navyforses/Agent-Command-Center.git
cd Agent-Command-Center

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Edit .env with your credentials
# Required:
#   DATABASE_URL=postgresql://...
#   SESSION_SECRET=any-random-string
# Optional (for AI features):
#   AI_INTEGRATIONS_OPENAI_API_KEY=sk-...

# 5. Push database schema
npm run db:push

# 6. Start development server
npm run dev
```

### IDE Setup (VS Code)

Recommended extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- GitLens

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

## Project Architecture

### Directory Structure

```
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── ui/         # Base UI components (Radix)
│   │   │   └── ...         # Feature components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React contexts
│   │   ├── lib/            # Utilities
│   │   └── App.tsx         # Main app with routing
│   └── index.html
│
├── server/                 # Backend (Express)
│   ├── routes.ts           # Main API routes
│   ├── *Routes.ts          # Feature-specific routes
│   ├── db.ts               # Database connection
│   ├── storage.ts          # Data access layer
│   ├── services/           # External API integrations
│   └── index.ts            # Server entry
│
├── shared/                 # Shared code
│   └── schema.ts           # Database schema (Drizzle)
│
└── docs/                   # Documentation
```

### Key Patterns

#### Frontend State Management

```typescript
// Server state with React Query
const { data, isLoading } = useQuery({
  queryKey: ['patient-profile'],
  queryFn: async () => {
    const res = await fetch('/api/patient-profile', {
      credentials: 'include'  // Always include for auth
    });
    if (!res.ok) throw new Error('Failed');
    return res.json();
  }
});

// Mutations
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['relevant-query'] });
  }
});
```

#### Backend Route Pattern

```typescript
// In routes.ts or *Routes.ts
import { isEmailAuthenticated } from './emailAuth';

// Protected route
app.get('/api/resource', isEmailAuthenticated, async (req, res) => {
  const userId = (req as any).user?.claims?.sub;

  try {
    const data = await storage.getResource(userId);
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### Database Operations (Drizzle)

```typescript
// In storage.ts
import { db } from './db';
import { users, children } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Query
const result = await db
  .select()
  .from(children)
  .where(eq(children.userId, userId));

// Insert
const [newChild] = await db
  .insert(children)
  .values({ userId, firstName, lastName })
  .returning();

// Update
await db
  .update(children)
  .set({ diagnosis })
  .where(eq(children.id, childId));
```

---

## Code Style

### TypeScript

- Use explicit types for function parameters
- Prefer interfaces for object shapes
- Use `type` for unions and intersections

```typescript
// Good
interface PatientProfile {
  id: number;
  fullName: string | null;
  diagnosis: string | null;
}

async function getProfile(userId: string): Promise<PatientProfile | null> {
  // ...
}

// Avoid
function getProfile(userId) {  // Missing types
  // ...
}
```

### React Components

- Use functional components with hooks
- Prefer composition over inheritance
- Keep components focused (single responsibility)

```typescript
// Good
export default function ProfileCard({ profile }: { profile: PatientProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{profile.fullName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{profile.diagnosis}</p>
      </CardContent>
    </Card>
  );
}

// Avoid: Large components with many responsibilities
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProfileCard.tsx` |
| Hooks | camelCase with `use` | `useAuth.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |
| Database tables | camelCase | `patientProfiles` |

### Imports Order

```typescript
// 1. React/external libraries
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal components
import { Card } from '@/components/ui/card';
import { ProfileCard } from '@/components/profile';

// 3. Hooks/utilities
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

// 4. Types
import type { PatientProfile } from '@shared/schema';
```

---

## Making Changes

### Branch Naming

```
feature/add-medication-tracking
fix/form100-upload-error
docs/update-api-reference
refactor/simplify-auth-flow
```

### Commit Messages

Follow conventional commits:

```
feat: add medication tracking page
fix: resolve Form 100 upload 401 error
docs: update API documentation
refactor: simplify authentication middleware
style: format with prettier
test: add e2e tests for trial search
```

### Adding a New Page

1. Create page component:
```typescript
// client/src/pages/NewPage.tsx
import { useLanguage } from '@/contexts/LanguageContext';

const translations = {
  ka: { title: 'ახალი გვერდი' },
  en: { title: 'New Page' }
};

export default function NewPage() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.ka;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold">{t.title}</h1>
    </div>
  );
}
```

2. Add route in App.tsx:
```typescript
// Add lazy import
const NewPage = lazy(() => import('@/pages/NewPage'));

// Add route in ProtectedRouter
<Route path="/new-page" component={NewPage} />
```

### Adding a New API Endpoint

1. Add route in routes.ts:
```typescript
// Protected endpoint
app.get('/api/new-endpoint', isEmailAuthenticated, async (req, res) => {
  const userId = (req as any).user?.claims?.sub;

  try {
    const data = await storage.getNewData(userId);
    res.json(data);
  } catch (error) {
    console.error('Error in /api/new-endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

2. Add storage function:
```typescript
// In storage.ts
async getNewData(userId: string) {
  return db.select().from(tableName).where(eq(tableName.userId, userId));
}
```

### Adding a Database Table

1. Define schema in shared/schema.ts:
```typescript
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

2. Push to database:
```bash
npm run db:push
```

---

## Testing

### E2E Tests (Playwright)

```bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test tests/auth.spec.ts
```

### Writing Tests

```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
});
```

### Manual Testing Checklist

Before submitting PR:
- [ ] Feature works in Georgian (ka)
- [ ] Feature works in English (en)
- [ ] Works on mobile viewport
- [ ] No console errors
- [ ] API returns correct responses
- [ ] Loading states shown
- [ ] Error states handled

---

## Pull Request Process

### Before Submitting

1. **Ensure your code builds:**
   ```bash
   npm run build
   ```

2. **Run type check:**
   ```bash
   npm run check
   ```

3. **Test your changes manually**

4. **Update documentation if needed**

### PR Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor

## Testing
How did you test these changes?

## Screenshots
(if applicable)

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Added comments for complex logic
- [ ] Updated documentation
- [ ] No new warnings
```

### Review Process

1. Create PR against `main` branch
2. Request review from maintainers
3. Address feedback
4. Squash and merge when approved

---

## Common Tasks

### Adding a Translation

```typescript
// In page component
const translations = {
  ka: {
    title: 'ქართული სათაური',
    description: 'ქართული აღწერა'
  },
  en: {
    title: 'English Title',
    description: 'English description'
  }
};
```

### Working with Forms

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email')
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = (data) => {
    // Handle submission
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Debugging

```typescript
// Backend logging
console.log('[API] Request:', req.method, req.path);
console.log('[API] User:', (req as any).user?.claims?.sub);

// Frontend debugging
console.log('[Component] Props:', props);
console.log('[Query] Data:', data);
```

---

## Getting Help

- **Questions:** Open a GitHub Discussion
- **Bugs:** Open a GitHub Issue
- **Security:** Email security@lookingforlife.com

---

Thank you for contributing! / მადლობა წვლილისთვის! 🎉
