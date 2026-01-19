-- Trial Navigator Database Schema
-- PostgreSQL (Supabase compatible)

-- ================================
-- Languages
-- ================================
CREATE TABLE IF NOT EXISTS languages (
    code VARCHAR(5) PRIMARY KEY,
    name_native VARCHAR(100) NOT NULL,
    name_english VARCHAR(100) NOT NULL,
    direction VARCHAR(3) DEFAULT 'ltr',
    tier INT DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    speakers_millions DECIMAL(10,2),
    diaspora_millions DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed languages
INSERT INTO languages (code, name_native, name_english, tier, speakers_millions, diaspora_millions) VALUES
-- Tier 1 - Caucasus & Central Asia
('ka', 'ქართული', 'Georgian', 1, 4.0, 2.0),
('hy', 'Հայdelays delays', 'Armenian', 1, 6.0, 7.0),
('az', 'Azərbaycan', 'Azerbaijani', 1, 10.0, 3.0),
('kk', 'Қазақша', 'Kazakh', 1, 13.0, 2.0),
('uz', 'Oʻzbekcha', 'Uzbek', 1, 35.0, 3.0),
('mn', 'Монгол', 'Mongolian', 1, 6.0, 0.5),
-- Tier 2 - European Minority
('eu', 'Euskara', 'Basque', 2, 0.75, 0.2),
('cy', 'Cymraeg', 'Welsh', 2, 0.9, 0.1),
('ga', 'Gaeilge', 'Irish', 2, 1.7, 0.5),
('mt', 'Malti', 'Maltese', 2, 0.5, 0.2),
('et', 'Eesti', 'Estonian', 2, 1.1, 0.2),
('lv', 'Latviešu', 'Latvian', 2, 1.5, 0.3),
('lt', 'Lietuvių', 'Lithuanian', 2, 3.0, 1.0),
-- Tier 3 - Asian
('km', 'ខ្មែរ', 'Khmer', 3, 16.0, 1.0),
('my', 'မြန်မာ', 'Burmese', 3, 33.0, 2.0),
('ne', 'नेपाली', 'Nepali', 3, 25.0, 3.0),
('si', 'සිංහල', 'Sinhala', 3, 17.0, 1.5),
('bn', 'বাংলা', 'Bengali', 3, 230.0, 15.0),
-- Tier 3 - African
('am', 'አማርኛ', 'Amharic', 3, 32.0, 2.0),
('ti', 'ትግርኛ', 'Tigrinya', 3, 9.0, 1.0),
('so', 'Soomaali', 'Somali', 3, 22.0, 2.0),
('sw', 'Kiswahili', 'Swahili', 3, 100.0, 1.0),
-- Common
('en', 'English', 'English', 0, 1500.0, 0.0),
('ru', 'Русский', 'Russian', 2, 250.0, 30.0)
ON CONFLICT (code) DO NOTHING;

-- ================================
-- Clinical Trials
-- ================================
CREATE TABLE IF NOT EXISTS trials (
    id SERIAL PRIMARY KEY,
    nct_id VARCHAR(20) UNIQUE,
    eudract_id VARCHAR(20),
    who_id VARCHAR(50),
    isrctn_id VARCHAR(20),

    title_original TEXT NOT NULL,
    summary_original TEXT,
    eligibility_original TEXT,

    condition TEXT[],
    intervention_type VARCHAR(100),
    intervention_name TEXT,

    phase VARCHAR(20),
    status VARCHAR(50),
    enrollment_target INT,

    start_date DATE,
    completion_date DATE,

    sponsor VARCHAR(500),
    lead_sponsor_type VARCHAR(50),

    location_countries TEXT[],
    location_cities TEXT[],
    location_facilities TEXT[],

    contact_name VARCHAR(200),
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),

    age_min VARCHAR(20),
    age_max VARCHAR(20),
    gender VARCHAR(20),

    source_registry VARCHAR(50) NOT NULL,
    source_url TEXT,
    source_ids JSONB,

    relevance_score DECIMAL(5,2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_fetched_at TIMESTAMP
);

-- Indexes for trials
CREATE INDEX IF NOT EXISTS idx_trials_condition ON trials USING GIN(condition);
CREATE INDEX IF NOT EXISTS idx_trials_status ON trials(status);
CREATE INDEX IF NOT EXISTS idx_trials_phase ON trials(phase);
CREATE INDEX IF NOT EXISTS idx_trials_countries ON trials USING GIN(location_countries);
CREATE INDEX IF NOT EXISTS idx_trials_nct ON trials(nct_id);
CREATE INDEX IF NOT EXISTS idx_trials_updated ON trials(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trials_search ON trials USING GIN(to_tsvector('english', title_original || ' ' || COALESCE(summary_original, '')));

-- ================================
-- Trial Translations
-- ================================
CREATE TABLE IF NOT EXISTS trial_translations (
    id SERIAL PRIMARY KEY,
    trial_id INT REFERENCES trials(id) ON DELETE CASCADE,
    language_code VARCHAR(5) REFERENCES languages(code),

    title_translated TEXT,
    summary_translated TEXT,
    eligibility_translated TEXT,
    simplified_summary TEXT,

    translated_at TIMESTAMP DEFAULT NOW(),
    translation_model VARCHAR(50) DEFAULT 'gpt-4o',
    translation_quality DECIMAL(3,2),
    human_reviewed BOOLEAN DEFAULT false,

    UNIQUE(trial_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_translations_lang ON trial_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_trial ON trial_translations(trial_id);

-- ================================
-- Medical Glossary
-- ================================
CREATE TABLE IF NOT EXISTS medical_glossary (
    id SERIAL PRIMARY KEY,
    term_english VARCHAR(300) NOT NULL,
    language_code VARCHAR(5) REFERENCES languages(code),
    term_translated VARCHAR(300) NOT NULL,
    definition_translated TEXT,
    category VARCHAR(50),
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(term_english, language_code)
);

CREATE INDEX IF NOT EXISTS idx_glossary_term ON medical_glossary(term_english);
CREATE INDEX IF NOT EXISTS idx_glossary_lang ON medical_glossary(language_code);

-- Seed Georgian glossary
INSERT INTO medical_glossary (term_english, language_code, term_translated, category, verified) VALUES
('hypoxic-ischemic encephalopathy', 'ka', 'ჰიპოქსიურ-იშემიური ენცეფალოპათია', 'condition', true),
('HIE', 'ka', 'ჰიპოქსიურ-იშემიური ენცეფალოპათია (HIE)', 'condition', true),
('cerebral palsy', 'ka', 'ცერებრული დამბლა', 'condition', true),
('epilepsy', 'ka', 'ეპილეფსია', 'condition', true),
('stem cell therapy', 'ka', 'ღეროვანი უჯრედების თერაპია', 'treatment', true),
('mesenchymal stem cells', 'ka', 'მეზენქიმური ღეროვანი უჯრედები', 'treatment', true),
('cord blood', 'ka', 'ჭიპლის სისხლი', 'treatment', true),
('therapeutic hypothermia', 'ka', 'თერაპიული ჰიპოთერმია', 'treatment', true),
('cooling therapy', 'ka', 'გაგრილების თერაპია', 'treatment', true),
('clinical trial', 'ka', 'კლინიკური კვლევა', 'trial_term', true),
('randomized controlled trial', 'ka', 'რანდომიზებული კონტროლირებადი კვლევა', 'trial_term', true),
('double-blind', 'ka', 'ორმაგად ბრმა', 'trial_term', true),
('placebo', 'ka', 'პლაცებო', 'trial_term', true),
('informed consent', 'ka', 'ინფორმირებული თანხმობა', 'trial_term', true),
('eligibility criteria', 'ka', 'შერჩევის კრიტერიუმები', 'trial_term', true),
('inclusion criteria', 'ka', 'ჩართვის კრიტერიუმები', 'trial_term', true),
('exclusion criteria', 'ka', 'გამორიცხვის კრიტერიუმები', 'trial_term', true),
('adverse event', 'ka', 'გვერდითი მოვლენა', 'trial_term', true),
('brain', 'ka', 'ტვინი', 'anatomy', true),
('spinal cord', 'ka', 'ზურგის ტვინი', 'anatomy', true),
('neurons', 'ka', 'ნეირონები', 'anatomy', true),
('neonatal', 'ka', 'ახალშობილთა', 'general', true),
('pediatric', 'ka', 'პედიატრიული', 'general', true),
('MRI', 'ka', 'მაგნიტურ-რეზონანსული ტომოგრაფია (MRI)', 'procedure', true),
('EEG', 'ka', 'ელექტროენცეფალოგრაფია (EEG)', 'procedure', true)
ON CONFLICT (term_english, language_code) DO NOTHING;

-- ================================
-- Users
-- ================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,

    primary_language VARCHAR(5) REFERENCES languages(code) DEFAULT 'en',
    secondary_language VARCHAR(5) REFERENCES languages(code),

    diagnosis_interests TEXT[],
    location_preferences TEXT[],
    age_category VARCHAR(20),

    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,

    email_frequency VARCHAR(20) DEFAULT 'weekly',
    email_verified BOOLEAN DEFAULT false,

    stripe_customer_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier);

-- ================================
-- Search History
-- ================================
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    query_text TEXT NOT NULL,
    query_language VARCHAR(5),
    filters_applied JSONB,
    results_count INT,
    searched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_date ON search_history(searched_at DESC);

-- ================================
-- Saved Trials
-- ================================
CREATE TABLE IF NOT EXISTS saved_trials (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    trial_id INT REFERENCES trials(id),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'saved',
    notification_enabled BOOLEAN DEFAULT true,
    saved_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, trial_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trial ON saved_trials(trial_id);

-- ================================
-- Deep Search Requests
-- ================================
CREATE TABLE IF NOT EXISTS deep_search_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),

    diagnosis TEXT NOT NULL,
    patient_age VARCHAR(20),
    patient_location VARCHAR(100),
    additional_info TEXT,

    status VARCHAR(20) DEFAULT 'pending',
    assigned_to VARCHAR(100),

    results_summary TEXT,
    trials_found INT,
    coordinators_contacted INT,

    payment_amount DECIMAL(10,2),
    payment_status VARCHAR(20),
    stripe_payment_id VARCHAR(100),

    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deep_search_user ON deep_search_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deep_search_status ON deep_search_requests(status);

-- ================================
-- Email Logs
-- ================================
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    email_type VARCHAR(50),
    trials_included INT[],
    sent_at TIMESTAMP DEFAULT NOW(),
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_user ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_date ON email_logs(sent_at DESC);

-- ================================
-- Data Source Status
-- ================================
CREATE TABLE IF NOT EXISTS data_source_status (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(20),
    records_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data sources
INSERT INTO data_source_status (source_name, display_name, is_active) VALUES
('clinicaltrials.gov', 'ClinicalTrials.gov (US)', true),
('who_ictrp', 'WHO ICTRP', true),
('eu_ctr', 'EU Clinical Trials Register', true),
('isrctn', 'ISRCTN Registry', true),
('anzctr', 'ANZCTR (Australia/NZ)', true),
('pubmed', 'PubMed', true),
('orphanet', 'Orphanet', true),
('openfda', 'OpenFDA', true)
ON CONFLICT (source_name) DO NOTHING;

-- ================================
-- Patient Profiles
-- ================================
CREATE TABLE IF NOT EXISTS patient_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    patient_name VARCHAR(200),
    date_of_birth DATE,
    gender VARCHAR(20),
    country VARCHAR(100),
    city VARCHAR(100),
    willing_to_travel BOOLEAN DEFAULT true,
    travel_distance_km INT,

    -- Medical info
    primary_diagnosis TEXT,
    diagnosis_date DATE,
    secondary_diagnoses TEXT[],
    medical_history TEXT,
    current_treatments TEXT[],
    past_treatments TEXT[],
    allergies TEXT[],

    -- Form 100 / Document
    form_100_text TEXT,
    ai_summary TEXT,
    extracted_conditions TEXT[],
    extracted_keywords TEXT[],

    -- Derived fields
    age_category VARCHAR(20), -- neonatal, pediatric, adult, elderly

    -- Preferences
    preferred_language VARCHAR(5) REFERENCES languages(code) DEFAULT 'ka',
    notification_frequency VARCHAR(20) DEFAULT 'weekly',
    content_types TEXT[] DEFAULT ARRAY['clinical_trial', 'research_result'],

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_conditions ON patient_profiles USING GIN(extracted_conditions);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_keywords ON patient_profiles USING GIN(extracted_keywords);

-- ================================
-- Notification Settings
-- ================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES patient_profiles(id) ON DELETE CASCADE UNIQUE,

    -- Channels
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,

    -- Frequency
    frequency VARCHAR(20) DEFAULT 'weekly', -- realtime, daily, weekly, monthly

    -- Content types to notify
    notify_trials BOOLEAN DEFAULT true,
    notify_results BOOLEAN DEFAULT true,
    notify_discoveries BOOLEAN DEFAULT true,
    notify_news BOOLEAN DEFAULT false,

    -- Thresholds
    urgent_threshold DECIMAL(5,2) DEFAULT 90.0, -- relevance score above this is urgent

    -- Email digest settings
    email_digest_day VARCHAR(10) DEFAULT 'sunday',
    email_digest_hour INT DEFAULT 9,

    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_profile ON notification_settings(profile_id);

-- ================================
-- Saved Feed Items
-- ================================
CREATE TABLE IF NOT EXISTS saved_feed_items (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES patient_profiles(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL, -- trial nct_id or news id
    item_type VARCHAR(50) DEFAULT 'clinical_trial',
    notes TEXT,
    saved_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(profile_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_feed_profile ON saved_feed_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_saved_feed_item ON saved_feed_items(item_id);

-- ================================
-- Feed Item History (for tracking what user has seen)
-- ================================
CREATE TABLE IF NOT EXISTS feed_item_history (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES patient_profiles(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50),

    viewed_at TIMESTAMP,
    clicked_at TIMESTAMP,
    shared_at TIMESTAMP,
    dismissed_at TIMESTAMP,

    relevance_score DECIMAL(5,2),

    UNIQUE(profile_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_history_profile ON feed_item_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_feed_history_date ON feed_item_history(viewed_at DESC);

-- ================================
-- Medical News Cache
-- ================================
CREATE TABLE IF NOT EXISTS medical_news (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(100) UNIQUE,

    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,

    source VARCHAR(100), -- pubmed, biorxiv, fda, sciencedaily
    source_url TEXT,

    content_type VARCHAR(50), -- research_result, discovery, drug_approval, news

    conditions TEXT[],
    keywords TEXT[],

    published_at TIMESTAMP,
    fetched_at TIMESTAMP DEFAULT NOW(),

    relevance_score DECIMAL(5,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_medical_news_conditions ON medical_news USING GIN(conditions);
CREATE INDEX IF NOT EXISTS idx_medical_news_keywords ON medical_news USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_medical_news_source ON medical_news(source);
CREATE INDEX IF NOT EXISTS idx_medical_news_type ON medical_news(content_type);
CREATE INDEX IF NOT EXISTS idx_medical_news_date ON medical_news(published_at DESC);

-- ================================
-- News Translations
-- ================================
CREATE TABLE IF NOT EXISTS news_translations (
    id SERIAL PRIMARY KEY,
    news_id INT REFERENCES medical_news(id) ON DELETE CASCADE,
    language_code VARCHAR(5) REFERENCES languages(code),

    title_translated TEXT,
    summary_translated TEXT,

    translated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(news_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_news_translations_lang ON news_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_news_translations_news ON news_translations(news_id);

-- ================================
-- Payment History
-- ================================
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    stripe_customer_id VARCHAR(100),
    stripe_invoice_id VARCHAR(100) UNIQUE,
    stripe_payment_intent_id VARCHAR(100),

    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(20),

    payment_type VARCHAR(50), -- subscription, deep_search
    description TEXT,

    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_customer ON payment_history(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history(paid_at DESC);
