# HIE Parent Command Center - Design Guidelines

## Design Approach

**Selected Approach:** Design System Foundation with Healthcare Adaptation
- **Primary Reference:** Material Design 3 principles for information-dense applications
- **Secondary Influences:** Healthcare dashboard patterns (Epic MyChart, Patient Portal UX)
- **Rationale:** Medical data management requires trust, clarity, and accessibility. Material Design provides robust patterns for complex data while remaining approachable for non-technical users.

## Core Design Principles

1. **Trust Through Clarity:** Professional medical aesthetic without clinical coldness
2. **Cognitive Load Management:** Progressive disclosure of complex medical information
3. **Empathetic Design:** Sensitive to emotional context of parents managing child's medical journey
4. **Bilingual Harmony:** Seamless English/Georgian language switching

## Typography

**Font Stack:**
- **Primary:** Inter (Google Fonts) - body text, forms, data displays
- **Headings:** Inter Semi-Bold/Bold - consistent hierarchy
- **Medical Data:** JetBrains Mono - test results, measurements, technical values

**Scale:**
- **Hero/Dashboard Headers:** text-3xl (30px) font-bold
- **Section Titles:** text-xl (20px) font-semibold  
- **Card Headers:** text-lg (18px) font-medium
- **Body Text:** text-base (16px) font-normal
- **Secondary/Meta:** text-sm (14px) font-normal
- **Medical Values:** text-lg font-mono font-semibold

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- **Component Padding:** p-6 (cards), p-4 (nested elements)
- **Section Spacing:** gap-8 between major sections
- **Form Elements:** gap-4 between inputs
- **Grid Gaps:** gap-6 for card grids

**Container Strategy:**
- **Max Width:** max-w-7xl for main content
- **Dashboard Grid:** 12-column responsive grid
- **Sidebar:** Fixed 280px width on desktop, collapsible on mobile

## Component Library

### Navigation
**Primary Navigation:** Sidebar (desktop) / Bottom tabs (mobile)
- Vertical sidebar with icon + label
- Sections: Dashboard, Child Profile, Documents, Therapy, Trials, Email, Calendar, AI Assistant
- Active state: filled background panel
- Icons: Heroicons (solid for active, outline for inactive)

### Dashboard Cards
**Information Cards:**
- Elevated cards with subtle shadow (shadow-sm)
- Rounded corners: rounded-lg
- Header section with icon + title + action menu
- Content area with clear data hierarchy
- Footer with timestamps/metadata

**Data Visualization Cards:**
- Progress indicators for milestones
- Timeline view for therapy schedules
- Chart.js integration for developmental tracking
- Color-coded status indicators (not specifying colors)

### Document Management
**Upload Zone:**
- Large drag-drop area with dashed border
- Icon + "Upload Medical Documents" text
- Supported formats list
- Processing status indicators

**Document List:**
- Table view with sortable columns (Date, Type, Doctor, Status)
- Quick preview thumbnails for images/PDFs
- Status badges (Processed, Pending OCR, AI Analyzed)
- Expandable rows for AI summaries

### Forms & Inputs
**Child Profile Form:**
- Multi-step wizard layout
- Progress indicator at top
- Grouped sections (Basic Info, Medical History, Functional Status)
- Help text for medical terminology (GMFCS, CFCS, EDACS levels)
- Autocomplete for diagnosis codes
- Date pickers for important dates

**Medical Data Inputs:**
- Number inputs with unit labels (kg, cm, weeks)
- Range sliders for scores (APGAR, Sarnat)
- Multi-select for conditions
- Rich text editor for notes

### AI Agent Interfaces
**Chat Interface:**
- Full-height conversation panel
- Message bubbles (user right-aligned, AI left-aligned)
- Typing indicators
- Suggested prompts as chips
- Source citations linking to documents

**Recommendation Cards:**
- Priority ranking (High/Medium/Low badges)
- Expandable details
- Evidence sources
- Action buttons (Schedule, Learn More, Dismiss)

### Email Hub
**Thread List:**
- Inbox-style layout
- Unread indicators
- Sentiment badges (Positive Response, Awaiting Reply)
- Preview snippets

**Compose/Draft:**
- Split view (compose panel + AI suggestions sidebar)
- Template selection
- Tone adjustment controls (Professional, Friendly, Urgent)
- Georgian/English toggle

### Clinical Trials
**Trial Cards:**
- Two-column grid on desktop
- Trial title + sponsor
- Eligibility match percentage
- Location + status
- Expandable criteria checklist
- Save/Contact actions

## Images

**Landing Page Hero:** 
- Warm, hopeful image of parent-child interaction (non-medical setting)
- Overlay text with semi-transparent backdrop blur
- CTA buttons with backdrop-blur-md

**Dashboard:**
- Avatar placeholders for child profiles (illustration style, not photos)
- Empty states with supportive illustrations (empty document folder, no trials yet)
- Success states with encouraging visuals

**Document Previews:**
- Thumbnail images for uploaded files
- PDF page previews
- Medical scan icons for different types (brain icon for MRI, wave for EEG)

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1024px (sidebar overlay, two-column cards)
- Desktop: > 1024px (persistent sidebar, three-column layouts)

**Mobile Adaptations:**
- Stack all cards vertically
- Collapsible sections with accordions
- Bottom sheet modals instead of sidebars
- Simplified data tables (priority columns only)
- Sticky action buttons

## Accessibility Features

- **ARIA Labels:** Comprehensive labeling for medical data
- **Keyboard Navigation:** Full keyboard support for forms and navigation
- **Screen Reader:** Optimized descriptions for complex medical information
- **Focus States:** Clear focus indicators (ring-2 ring-offset-2)
- **Language Switching:** Persistent language toggle in header (EN/ქარ)
- **Font Scaling:** Support for browser zoom up to 200%

## Animations

**Minimal, Purposeful Motion:**
- Card hover: subtle lift (transform scale-101)
- Page transitions: fade + slide (150ms ease-in-out)
- Loading states: skeleton screens (not spinners)
- Success confirmations: check icon animation
- NO: Parallax, complex scroll animations, auto-playing media

## Special Considerations

**Medical Data Display:**
- Clearly distinguish normal vs. abnormal values
- Tooltips for medical terminology
- Comparison views (previous vs. current results)
- Print-friendly layouts for sharing with doctors

**Multilingual Design:**
- Allow 30% more space for Georgian text (longer than English)
- RTL-ready grid system (future Arabic support)
- Consistent icon usage across languages
- Cultural sensitivity in imagery

**Trust Signals:**
- HIPAA compliance badge
- Data encryption indicators
- Last synced timestamps
- Clear data source attribution
- Privacy policy accessibility