-- Migration: Add soft delete support and performance indexes
-- Date: 2026-01-21

-- Add language_preference and deletedAt to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'ka';
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add deletedAt to clinical_trials table
ALTER TABLE clinical_trials ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_trials_conditions ON clinical_trials USING GIN (conditions);

-- Add deletedAt and updatedAt to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);

-- Add additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_trials_user_trial ON user_saved_trials(user_id, trial_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON trial_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_translations_trial ON trial_translations(trial_id);

-- Add composite index for trial search optimization
CREATE INDEX IF NOT EXISTS idx_trials_status_phase ON clinical_trials(status, phase);
