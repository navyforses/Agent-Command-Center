# API Documentation / API დოკუმენტაცია

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication / ავთენტიფიკაცია

All protected endpoints require session authentication. Include credentials in fetch requests:

```typescript
fetch('/api/endpoint', {
  credentials: 'include'  // Required for session cookies
});
```

---

## Auth Endpoints / ავთენტიფიკაციის ენდპოინტები

### Register User / რეგისტრაცია

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "გიორგი",
  "lastName": "მაისურაძე"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "გიორგი",
    "lastName": "მაისურაძე"
  }
}
```

### Login / შესვლა

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "გიორგი"
  }
}
```

### Get Current User / მიმდინარე მომხმარებელი

```http
GET /api/auth/user
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "გიორგი",
  "lastName": "მაისურაძე"
}
```

### Logout / გასვლა

```http
GET /api/logout
```

---

## Patient Profile / პაციენტის პროფილი

### Get Profile / პროფილის მიღება

```http
GET /api/patient-profile
```

**Response:**
```json
{
  "profile": {
    "id": 1,
    "fullName": "ნინო მაისურაძე",
    "birthDate": "2020-05-15",
    "gender": "female",
    "personalNumber": "01234567890",
    "primaryDiagnosis": "ჰიპოქსიურ-იშემიური ენცეფალოპათია",
    "icd10Codes": ["G80.0", "P91.6"],
    "attendingPhysician": "დ. გელაშვილი",
    "medicalInstitution": "თბილისის ბავშვთა კლინიკა",
    "extractionConfidence": 0.85
  },
  "researchMonitor": {
    "isActive": true,
    "monitorClinicalTrials": true,
    "monitorPubmed": true,
    "lastScanAt": "2024-01-15T10:30:00Z"
  }
}
```

### Upload Form 100 / ფორმა 100-ის ატვირთვა

```http
POST /api/patient-profile/upload-form100
Content-Type: multipart/form-data

file: <PDF or Image file>
```

**Response:**
```json
{
  "profile": {
    "fullName": "ნინო მაისურაძე",
    "birthDate": "2020-05-15",
    "primaryDiagnosis": "ჰიპოქსიურ-იშემიური ენცეფალოპათია",
    "icd10Codes": ["G80.0"],
    "extractionConfidence": 0.85
  },
  "lowConfidenceFields": ["secondaryDiagnoses"]
}
```

### Update Profile / პროფილის განახლება

```http
PUT /api/patient-profile
Content-Type: application/json

{
  "fullName": "ნინო მაისურაძე",
  "primaryDiagnosis": "განახლებული დიაგნოზი",
  "icd10Codes": ["G80.0", "P91.6"]
}
```

---

## Clinical Trials / კლინიკური კვლევები

### Search Trials / კვლევების ძიება

```http
GET /api/trials/search?query=cerebral+palsy&status=RECRUITING&page=1&pageSize=10
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| query | string | Search term (condition, intervention) |
| status | string | RECRUITING, COMPLETED, ACTIVE, etc. |
| phase | string | PHASE1, PHASE2, PHASE3, PHASE4 |
| page | number | Page number (default: 1) |
| pageSize | number | Results per page (default: 10, max: 100) |

**Response:**
```json
{
  "studies": [
    {
      "nctId": "NCT12345678",
      "title": "Study of New Treatment for Cerebral Palsy",
      "status": "RECRUITING",
      "conditions": ["Cerebral Palsy"],
      "interventions": ["Drug: Experimental Treatment"],
      "phases": ["PHASE2"],
      "locations": [
        {
          "facility": "Children's Hospital",
          "city": "Boston",
          "country": "United States"
        }
      ],
      "startDate": "2024-01-01",
      "completionDate": "2025-12-31"
    }
  ],
  "totalCount": 150,
  "nextPageToken": "token123"
}
```

### Get Trial Details / კვლევის დეტალები

```http
GET /api/trials/:nctId
```

**Response:**
```json
{
  "nctId": "NCT12345678",
  "title": "Study of New Treatment",
  "briefSummary": "This study evaluates...",
  "detailedDescription": "Full study description...",
  "eligibility": {
    "criteria": "Inclusion: Ages 2-18...",
    "minAge": "2 Years",
    "maxAge": "18 Years",
    "sex": "All"
  },
  "contacts": [
    {
      "name": "Dr. Smith",
      "phone": "+1-555-0123",
      "email": "study@hospital.org"
    }
  ],
  "sponsor": "National Institutes of Health"
}
```

### Save Trial / კვლევის შენახვა

```http
POST /api/trials/save
Content-Type: application/json

{
  "nctId": "NCT12345678"
}
```

### Get Saved Trials / შენახული კვლევები

```http
GET /api/trials/saved
```

**Response:**
```json
{
  "trials": [
    {
      "nctId": "NCT12345678",
      "title": "Study Title",
      "status": "RECRUITING",
      "savedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Unsave Trial / კვლევის წაშლა

```http
DELETE /api/trials/:nctId
```

---

## Research Monitor / კვლევის მონიტორი

### Enable Monitoring / მონიტორინგის ჩართვა

```http
POST /api/research-monitor/enable
```

**Response:**
```json
{
  "monitor": {
    "id": 1,
    "isActive": true,
    "searchKeywords": ["cerebral palsy", "HIE"],
    "monitorClinicalTrials": true,
    "monitorPubmed": true,
    "monitorDrugs": true,
    "monitorNews": true
  }
}
```

### Disable Monitoring / მონიტორინგის გამორთვა

```http
POST /api/research-monitor/disable
```

### Get Research Findings / აღმოჩენები

```http
GET /api/research-findings?limit=20
```

**Response:**
```json
{
  "findings": [
    {
      "id": 1,
      "findingType": "clinical_trial",
      "title": "New Treatment Study",
      "summary": "A promising new study...",
      "sourceUrl": "https://clinicaltrials.gov/...",
      "relevanceScore": 0.92,
      "foundAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Documents / დოკუმენტები

### List Documents / დოკუმენტების სია

```http
GET /api/documents
```

**Response:**
```json
{
  "documents": [
    {
      "id": 1,
      "title": "MRI Report 2024",
      "documentType": "mri_report",
      "fileSize": 2048576,
      "processingStatus": "completed",
      "aiSummary": "MRI shows improvement in...",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Upload Document / დოკუმენტის ატვირთვა

```http
POST /api/documents
Content-Type: multipart/form-data

file: <PDF or Image file>
title: "MRI Report January 2024"
documentType: "mri_report"
childId: 1  (optional)
```

**Document Types:**
- `form_100` - ფორმა 100
- `diagnosis` - დიაგნოზი
- `mri_report` - MRI ანგარიში
- `therapy_note` - თერაპიის ჩანაწერი
- `prescription` - რეცეპტი
- `lab_result` - ლაბორატორიული შედეგი
- `research` - კვლევა
- `other` - სხვა

### Analyze Document with AI / AI ანალიზი

```http
POST /api/documents/:id/analyze
```

**Response:**
```json
{
  "summary": "Document analysis summary...",
  "summaryGeorgian": "დოკუმენტის ანალიზის შეჯამება...",
  "keyFindings": [
    "Finding 1",
    "Finding 2"
  ],
  "suggestedActions": [
    "Consider discussing with neurologist",
    "Schedule follow-up MRI"
  ]
}
```

---

## Children / ბავშვები

### List Children / ბავშვების სია

```http
GET /api/children
```

### Create Child / ბავშვის დამატება

```http
POST /api/children
Content-Type: application/json

{
  "firstName": "ნინო",
  "lastName": "მაისურაძე",
  "dateOfBirth": "2020-05-15",
  "diagnosis": "ჰიპოქსიურ-იშემიური ენცეფალოპათია"
}
```

### Get Child / ბავშვის მიღება

```http
GET /api/children/:id
```

### Update Child / ბავშვის განახლება

```http
PATCH /api/children/:id
Content-Type: application/json

{
  "diagnosis": "Updated diagnosis"
}
```

---

## Therapies / თერაპიები

### List Therapies / თერაპიების სია

```http
GET /api/therapies
GET /api/children/:childId/therapies
```

### Create Therapy / თერაპიის შექმნა

```http
POST /api/therapies
Content-Type: application/json

{
  "childId": 1,
  "therapyType": "physical_therapy",
  "therapistName": "მარიამ ბერიძე",
  "frequency": "twice_weekly",
  "goals": ["Improve mobility", "Strengthen core"]
}
```

### Log Therapy Session / სესიის ჩაწერა

```http
POST /api/therapies/:therapyId/sessions
Content-Type: application/json

{
  "sessionDate": "2024-01-15T10:00:00Z",
  "duration": 45,
  "progressRating": 4,
  "notes": "Good progress on balance exercises",
  "aiInsights": "Consistent improvement observed"
}
```

---

## AI Chat / AI ჩატი

### Send Message / შეტყობინების გაგზავნა

```http
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "What are the latest treatments for HIE?"
    }
  ],
  "conversationId": "uuid"  // optional
}
```

**Response:**
```json
{
  "response": "Based on current research, treatments for HIE include...",
  "conversationId": "uuid",
  "sources": [
    {
      "title": "Recent Advances in HIE Treatment",
      "url": "https://pubmed.ncbi.nlm.nih.gov/..."
    }
  ]
}
```

---

## User Preferences / მომხმარებლის პარამეტრები

### Get Preferences / პარამეტრების მიღება

```http
GET /api/user/preferences
```

**Response:**
```json
{
  "theme": "light",
  "language": "ka",
  "emailNotifications": true,
  "pushNotifications": false,
  "digestFrequency": "daily"
}
```

### Update Preferences / პარამეტრების განახლება

```http
PUT /api/user/preferences
Content-Type: application/json

{
  "theme": "dark",
  "language": "en",
  "emailNotifications": false
}
```

---

## Error Responses / შეცდომების პასუხები

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}  // optional
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | BAD_REQUEST | Invalid request data |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Permission denied |
| 404 | NOT_FOUND | Resource not found |
| 422 | VALIDATION_ERROR | Validation failed |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## Rate Limits / მოთხოვნების ლიმიტები

| Endpoint | Limit |
|----------|-------|
| `/api/trials/search` | 10 requests/second |
| `/api/chat` | 20 requests/minute |
| `/api/documents/analyze` | 10 requests/minute |
| Other endpoints | 100 requests/minute |

---

## Webhook Events / Webhook მოვლენები

(Coming soon / მალე)

```json
{
  "event": "research_finding.new",
  "data": {
    "findingId": 1,
    "title": "New relevant trial found"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```
