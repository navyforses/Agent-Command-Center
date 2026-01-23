# Environment Variables / გარემოს ცვლადები

ეს დოკუმენტი აღწერს Trial Navigator-ის ყველა გარემოს ცვლადს.

---

## სწრაფი მიმოხილვა

| კატეგორია | სავალდებულო | არასავალდებულო |
|-----------|-------------|----------------|
| Database | 1 | 0 |
| Authentication | 3 | 0 |
| AI APIs | 5 | 5 |
| Search APIs | 0 | 3 |
| Email | 0 | 2 |
| Storage | 0 | 3 |
| Other | 0 | 3 |

---

## სავალდებულო ცვლადები (Required)

### Database

| ცვლადი | აღწერა | მაგალითი |
|--------|--------|----------|
| `DATABASE_URL` | PostgreSQL კავშირის URL | `postgresql://user:pass@host:5432/db` |

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/trial_navigator"
```

### Authentication

| ცვლადი | აღწერა | მაგალითი |
|--------|--------|----------|
| `SESSION_SECRET` | სესიის დაშიფვრის გასაღები | რანდომული 32+ სიმბოლო |
| `REPL_ID` | Replit აპლიკაციის ID | `abc123...` |
| `ISSUER_URL` | OIDC ისუერის URL | `https://replit.com/oidc` |

```bash
SESSION_SECRET="your-very-long-random-secret-key-here-32-chars-min"
REPL_ID="your-replit-app-id"
ISSUER_URL="https://replit.com/oidc"
```

---

## AI API Keys (სავალდებულო მინიმუმ 1)

### OpenAI (GPT-4)

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API გასაღები | [platform.openai.com](https://platform.openai.com/api-keys) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | (არასავალდებულო) Custom base URL | `https://api.openai.com/v1` |
| `OPENAI_API_KEY` | ალტერნატიული OpenAI გასაღები | იგივე წყარო |

```bash
AI_INTEGRATIONS_OPENAI_API_KEY="sk-..."
AI_INTEGRATIONS_OPENAI_BASE_URL="https://api.openai.com/v1"
```

### Anthropic (Claude)

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API გასაღები | [console.anthropic.com](https://console.anthropic.com/) |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | (არასავალდებულო) Custom base URL | `https://api.anthropic.com` |

```bash
AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-..."
AI_INTEGRATIONS_ANTHROPIC_BASE_URL="https://api.anthropic.com"
```

### Google (Gemini)

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Google Gemini API გასაღები | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | (არასავალდებულო) Custom base URL | - |
| `GEMINI_API_KEY` | ალტერნატიული Gemini გასაღები | იგივე წყარო |

```bash
AI_INTEGRATIONS_GEMINI_API_KEY="AIza..."
```

### X.AI (Grok)

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `XAI_API_KEY` | X.AI/Grok API გასაღები | [x.ai](https://x.ai/) |

```bash
XAI_API_KEY="xai-..."
```

### Perplexity

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `PERPLEXITY_API_KEY` | Perplexity API გასაღები | [perplexity.ai](https://www.perplexity.ai/) |

```bash
PERPLEXITY_API_KEY="pplx-..."
```

---

## Search APIs (არასავალდებულო)

### Tavily Search

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `TAVILY_API_KEY` | Tavily AI Search API | [tavily.com](https://tavily.com/) |

```bash
TAVILY_API_KEY="tvly-..."
```

### Google Custom Search

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_SEARCH_CX` | Custom Search Engine ID | [Programmable Search Engine](https://programmablesearchengine.google.com/) |

```bash
GOOGLE_SEARCH_API_KEY="AIza..."
GOOGLE_SEARCH_CX="your-search-engine-id"
```

---

## Medical APIs (არასავალდებულო)

### PubMed

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `PUBMED_API_KEY` | NCBI E-utilities API გასაღები | [NCBI](https://www.ncbi.nlm.nih.gov/account/settings/) |

```bash
PUBMED_API_KEY="your-ncbi-api-key"
```

### OpenFDA

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `OPENFDA_API_KEY` | openFDA API გასაღები | [open.fda.gov](https://open.fda.gov/apis/authentication/) |

```bash
OPENFDA_API_KEY="your-openfda-key"
```

---

## Email Configuration (არასავალდებულო)

### Gmail SMTP

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `GMAIL_USER` | Gmail მისამართი | თქვენი Gmail |
| `GMAIL_APP_PASSWORD` | App Password (არა ძირითადი პაროლი!) | [Google Account Security](https://myaccount.google.com/apppasswords) |

```bash
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

**მნიშვნელოვანი:** გამოიყენეთ App Password, არა თქვენი Gmail პაროლი!

---

## Storage & Vector DB (არასავალდებულო)

### Pinecone Vector Database

| ცვლადი | აღწერა | საიდან მივიღოთ |
|--------|--------|----------------|
| `PINECONE_API_KEY` | Pinecone API გასაღები | [pinecone.io](https://www.pinecone.io/) |
| `PINECONE_INDEX_NAME` | ინდექსის სახელი | default: `prometheus-mind` |

```bash
PINECONE_API_KEY="your-pinecone-key"
PINECONE_INDEX_NAME="prometheus-mind"
```

### Object Storage

| ცვლადი | აღწერა | მაგალითი |
|--------|--------|----------|
| `PUBLIC_OBJECT_SEARCH_PATHS` | საჯარო ფაილების paths | `/uploads,/public` |
| `PRIVATE_OBJECT_DIR` | პირადი ფაილების დირექტორია | `/private` |

```bash
PUBLIC_OBJECT_SEARCH_PATHS="/uploads,/public"
PRIVATE_OBJECT_DIR="/private"
```

---

## Security (არასავალდებულო)

### Clinical Data Encryption

| ცვლადი | აღწერა | მაგალითი |
|--------|--------|----------|
| `CLINICAL_ENCRYPTION_KEY` | კლინიკური მონაცემების დაშიფვრის გასაღები | 64 hex სიმბოლო |

```bash
CLINICAL_ENCRYPTION_KEY="your-64-char-hex-key-here..."
```

**თუ არ მიუთითებთ, სისტემა ავტომატურად გენერირებს.**

---

## Runtime Configuration

| ცვლადი | აღწერა | default |
|--------|--------|---------|
| `NODE_ENV` | გარემოს ტიპი | `development` |
| `PORT` | სერვერის პორტი | `5000` |

```bash
NODE_ENV="production"
PORT="5000"
```

---

## მინიმალური .env მაგალითი

```bash
# === სავალდებულო ===
DATABASE_URL="postgresql://user:password@localhost:5432/trial_navigator"
SESSION_SECRET="your-very-long-random-secret-key-minimum-32-characters"
REPL_ID="your-replit-app-id"

# === AI APIs (მინიმუმ 1 სავალდებულო) ===
AI_INTEGRATIONS_OPENAI_API_KEY="sk-..."
AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-..."
AI_INTEGRATIONS_GEMINI_API_KEY="AIza..."

# === არასავალდებულო ===
XAI_API_KEY="xai-..."
PERPLEXITY_API_KEY="pplx-..."
TAVILY_API_KEY="tvly-..."
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

---

## სრული .env მაგალითი

```bash
# =============================================
# Trial Navigator - Environment Variables
# =============================================

# === Database ===
DATABASE_URL="postgresql://username:password@localhost:5432/trial_navigator"

# === Authentication ===
SESSION_SECRET="your-super-secret-session-key-at-least-32-characters-long"
REPL_ID="your-replit-application-id"
ISSUER_URL="https://replit.com/oidc"

# === AI APIs ===
# OpenAI (GPT-4)
AI_INTEGRATIONS_OPENAI_API_KEY="sk-..."
AI_INTEGRATIONS_OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_API_KEY="sk-..."

# Anthropic (Claude)
AI_INTEGRATIONS_ANTHROPIC_API_KEY="sk-ant-..."
AI_INTEGRATIONS_ANTHROPIC_BASE_URL="https://api.anthropic.com"

# Google (Gemini)
AI_INTEGRATIONS_GEMINI_API_KEY="AIza..."
AI_INTEGRATIONS_GEMINI_BASE_URL=""
GEMINI_API_KEY="AIza..."

# X.AI (Grok)
XAI_API_KEY="xai-..."

# Perplexity
PERPLEXITY_API_KEY="pplx-..."

# === Search APIs ===
TAVILY_API_KEY="tvly-..."
GOOGLE_SEARCH_API_KEY="AIza..."
GOOGLE_SEARCH_CX="your-custom-search-engine-id"

# === Medical APIs ===
PUBMED_API_KEY="your-ncbi-api-key"
OPENFDA_API_KEY="your-openfda-api-key"

# === Email ===
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# === Storage ===
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX_NAME="prometheus-mind"
PUBLIC_OBJECT_SEARCH_PATHS="/uploads,/public"
PRIVATE_OBJECT_DIR="/private"

# === Security ===
CLINICAL_ENCRYPTION_KEY="your-64-character-hex-encryption-key"

# === Runtime ===
NODE_ENV="development"
PORT="5000"
```

---

## API გასაღებების მიღების ინსტრუქციები

### OpenAI
1. გადადით [platform.openai.com](https://platform.openai.com)
2. შექმენით ანგარიში ან შედით
3. გადადით API Keys სექციაში
4. დააჭირეთ "Create new secret key"

### Anthropic
1. გადადით [console.anthropic.com](https://console.anthropic.com)
2. შექმენით ანგარიში
3. გადადით API Keys სექციაში
4. შექმენით ახალი გასაღები

### Google Gemini
1. გადადით [aistudio.google.com](https://aistudio.google.com)
2. შედით Google ანგარიშით
3. დააჭირეთ "Get API Key"
4. აირჩიეთ ან შექმენით პროექტი

### Gmail App Password
1. გადადით [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification (ჩართეთ თუ არ არის)
3. Security → App passwords
4. შექმენით ახალი app password "Mail" აპლიკაციისთვის

---

## უსაფრთხოების რეკომენდაციები

1. **არასოდეს** დაკომიტოთ .env ფაილი git-ში
2. გამოიყენეთ `.env.example` შაბლონად (მნიშვნელობების გარეშე)
3. Production-ში გამოიყენეთ environment secrets (Replit Secrets, etc.)
4. რეგულარულად განაახლეთ API გასაღებები
5. გამოიყენეთ სხვადასხვა გასაღებები development/production-ისთვის

---

**დოკუმენტი შექმნილია:** 2026-01-23
