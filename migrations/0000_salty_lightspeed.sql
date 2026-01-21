CREATE TABLE "accumulated_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"child_id" integer,
	"knowledge_type" varchar(50) NOT NULL,
	"title_en" text NOT NULL,
	"title_ka" text,
	"content_en" text NOT NULL,
	"content_ka" text,
	"confidence" integer DEFAULT 50,
	"validation_count" integer DEFAULT 0,
	"contradiction_count" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'active',
	"sources" jsonb,
	"contributing_cycle_ids" integer[],
	"origin_cycle_id" integer,
	"origin_insight_id" integer,
	"related_knowledge_ids" integer[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"child_id" integer,
	"title" varchar NOT NULL,
	"description" text,
	"location" varchar,
	"appointment_date" timestamp NOT NULL,
	"end_date" timestamp,
	"reminder_sent" boolean DEFAULT false,
	"status" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"conversation_id" integer,
	"role" varchar,
	"content" text NOT NULL,
	"search_sources" jsonb,
	"is_search_result" boolean DEFAULT false,
	"document_ids" integer[],
	"attachments" jsonb,
	"action_type" varchar,
	"action_data" jsonb,
	"action_status" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"date_of_birth" date,
	"diagnosis" text,
	"diagnosis_ka" text,
	"diagnosis_date" date,
	"notes" text,
	"notes_ka" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clinical_trials" (
	"id" serial PRIMARY KEY NOT NULL,
	"nct_number" varchar(20),
	"eudract_number" varchar(30),
	"who_id" varchar(50),
	"isrctn_number" varchar(30),
	"title_en" text NOT NULL,
	"brief_summary_en" text,
	"detailed_description_en" text,
	"status" varchar(50),
	"phase" varchar(20),
	"study_type" varchar(50),
	"eligibility_criteria_en" text,
	"min_age" varchar(20),
	"max_age" varchar(20),
	"gender" varchar(20),
	"healthy_volunteers" boolean DEFAULT false,
	"conditions" jsonb,
	"interventions" jsonb,
	"locations" jsonb,
	"contacts" jsonb,
	"sponsor_name" varchar(255),
	"sponsor_type" varchar(50),
	"start_date" date,
	"completion_date" date,
	"last_update_date" timestamp,
	"sources" jsonb,
	"relevance_score" real,
	"quality_score" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clinical_trials_nct_number_unique" UNIQUE("nct_number")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"title" varchar NOT NULL,
	"preview" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_source_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_name" varchar(50) NOT NULL,
	"source_display_name" varchar(100),
	"last_sync_at" timestamp,
	"last_sync_status" varchar(20),
	"records_count" integer DEFAULT 0,
	"error_message" text,
	"is_active" boolean DEFAULT true,
	"sync_interval_hours" integer DEFAULT 24,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "data_source_status_source_name_unique" UNIQUE("source_name")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"child_id" integer,
	"title" varchar NOT NULL,
	"category" varchar,
	"file_path" varchar,
	"file_type" varchar,
	"file_size" integer,
	"ai_summary" text,
	"ai_summary_ka" text,
	"ai_key_findings" text[],
	"document_type" varchar,
	"processing_status" varchar DEFAULT 'pending',
	"purpose" text,
	"extracted_text" text,
	"conversation_id" integer,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"subject" varchar,
	"recipient" varchar,
	"body" text,
	"status" varchar,
	"category" varchar,
	"ai_draft_content" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evolution_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"child_id" integer,
	"status" varchar(50) DEFAULT 'active',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"trigger_document_id" integer,
	"diagnosis_context" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evolution_daily_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer,
	"run_date" date NOT NULL,
	"current_phase" varchar(50),
	"phase_started_at" timestamp,
	"status" varchar(50) DEFAULT 'running',
	"phases_completed" text[],
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "evolution_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"daily_run_id" integer,
	"phase" varchar(50) NOT NULL,
	"insight_type" varchar(50),
	"content_en" text,
	"content_ka" text,
	"sources" jsonb,
	"metadata" jsonb,
	"confidence" integer,
	"relevance_score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evolution_report_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"user_id" varchar,
	"role" varchar(20),
	"content" text NOT NULL,
	"content_ka" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evolution_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"daily_run_id" integer,
	"report_date" date NOT NULL,
	"title_en" varchar(500),
	"title_ka" varchar(500),
	"summary_en" text,
	"summary_ka" text,
	"content_en" text,
	"content_ka" text,
	"key_findings_en" text[],
	"key_findings_ka" text[],
	"hypotheses_generated" jsonb,
	"sources_compiled" jsonb,
	"file_path" varchar(500),
	"conversation_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"name_native" varchar(100) NOT NULL,
	"name_english" varchar(100) NOT NULL,
	"direction" varchar(3) DEFAULT 'ltr',
	"tier" integer DEFAULT 2,
	"is_active" boolean DEFAULT true,
	"speakers_millions" real,
	"diaspora_millions" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medical_glossary" (
	"id" serial PRIMARY KEY NOT NULL,
	"term_english" varchar(255) NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"term_translated" varchar(255) NOT NULL,
	"definition_translated" text,
	"category" varchar(50),
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'medium',
	"source_type" varchar(50),
	"source_id" integer,
	"status" varchar(50) DEFAULT 'pending',
	"due_date" date,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "nexus_ai_agents" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7),
	"description" text,
	"strengths" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_ai_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"finding_id" integer,
	"ai_agent_id" varchar(50),
	"perspective" text,
	"confidence" integer,
	"key_points" text[],
	"concerns" text[],
	"unique_insights" text[],
	"raw_response" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_debates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"question" text NOT NULL,
	"position_a" jsonb,
	"position_b" jsonb,
	"resolution_needed" text,
	"priority" varchar(20) DEFAULT 'medium',
	"status" varchar(50) DEFAULT 'open',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_disciplinary_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"finding_id" integer,
	"discipline" varchar(100) NOT NULL,
	"analysis" text,
	"cross_connections" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"query_id" integer,
	"evolution_cycle_id" integer,
	"title" text NOT NULL,
	"title_ka" text,
	"summary" text,
	"summary_ka" text,
	"consensus_level" varchar(10),
	"confidence_score" integer,
	"relevance_score" integer,
	"sources" jsonb,
	"hypotheses_generated" text[],
	"hypotheses_generated_ka" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_hypotheses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"hypothesis_code" varchar(20),
	"statement" text NOT NULL,
	"statement_ka" text,
	"status" varchar(50) DEFAULT 'nascent',
	"confidence_score" integer,
	"proposed_by" varchar(50),
	"supported_by" text[],
	"supporting_evidence" jsonb,
	"contradicting_evidence" jsonb,
	"cross_disciplinary_basis" jsonb,
	"testability" text,
	"action_items" jsonb,
	"origin" varchar(20) DEFAULT 'nexus',
	"evolution_insight_id" integer,
	"evolution_cycle_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nexus_hypotheses_hypothesis_code_unique" UNIQUE("hypothesis_code")
);
--> statement-breakpoint
CREATE TABLE "nexus_knowledge_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"source_id" integer,
	"target_id" integer,
	"relationship" varchar(100),
	"strength" real,
	"discovered_by" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_knowledge_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"label" text NOT NULL,
	"node_type" varchar(50),
	"relevance_score" integer,
	"evidence_level" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nexus_research_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"query_text" text NOT NULL,
	"disciplines" text[],
	"research_focus" text[],
	"ai_agents" text[],
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"full_name" varchar(255),
	"birth_date" date,
	"gender" varchar(20),
	"personal_number" varchar(11),
	"primary_diagnosis" text,
	"icd10_codes" text[],
	"secondary_diagnoses" text[],
	"diagnosis_date" date,
	"attending_physician" varchar(255),
	"medical_institution" varchar(255),
	"disability_status" varchar(100),
	"disability_group" varchar(50),
	"medical_history" text,
	"current_medications" text[],
	"allergies" text[],
	"ai_extracted_data" jsonb,
	"extraction_confidence" real,
	"source_document_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "patient_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "prometheus_autonomous_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"action_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"description_ka" text,
	"trigger_reason" text,
	"input_data" jsonb,
	"output_data" jsonb,
	"confidence" real,
	"requires_review" boolean DEFAULT false,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"review_outcome" varchar(50),
	"impact_assessment" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_clinical_data_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"integration_id" integer,
	"prometheus_id" integer,
	"import_type" varchar(50) NOT NULL,
	"data_type" varchar(100) NOT NULL,
	"record_count" integer DEFAULT 0,
	"processed_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_log" text,
	"memories_created" integer DEFAULT 0,
	"knowledge_nodes_created" integer DEFAULT 0,
	"insights" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_clinical_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"child_id" integer,
	"integration_type" varchar(50) NOT NULL,
	"provider_name" varchar(255) NOT NULL,
	"provider_type" varchar(100),
	"connection_status" varchar(50) DEFAULT 'pending',
	"last_sync_at" timestamp,
	"last_sync_status" varchar(50),
	"sync_frequency" varchar(50) DEFAULT 'daily',
	"data_types" text[],
	"encryption_key" text,
	"api_endpoint" varchar(500),
	"credentials" jsonb,
	"consent_given" boolean DEFAULT false,
	"consent_given_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_consolidation_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"phase" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"memories_processed" integer DEFAULT 0,
	"memories_consolidated" integer DEFAULT 0,
	"memories_pruned" integer DEFAULT 0,
	"nodes_created" integer DEFAULT 0,
	"nodes_updated" integer DEFAULT 0,
	"edges_created" integer DEFAULT 0,
	"errors" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"error_type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'minor',
	"description" text NOT NULL,
	"prediction" text,
	"actual_outcome" text,
	"root_cause" text,
	"correction" text,
	"prevention_strategy" text,
	"affected_memory_ids" integer[],
	"affected_node_ids" integer[],
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_expert_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"full_name_ka" varchar(255),
	"title" varchar(100),
	"specialization" varchar(100) NOT NULL,
	"institution" varchar(255),
	"institution_ka" varchar(255),
	"country" varchar(100),
	"credentials" jsonb,
	"verification_status" varchar(50) DEFAULT 'pending',
	"verified_at" timestamp,
	"verified_by" varchar(255),
	"expertise_areas" text[],
	"publications_count" integer DEFAULT 0,
	"review_count" integer DEFAULT 0,
	"trust_score" real DEFAULT 0.5,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_expert_debates" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"topic" text NOT NULL,
	"topic_ka" text,
	"participants" text[],
	"positions" jsonb,
	"consensus" text,
	"consensus_ka" text,
	"consensus_confidence" integer,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"related_node_ids" integer[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_expert_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" integer,
	"target_type" varchar(50) NOT NULL,
	"target_id" integer NOT NULL,
	"prometheus_id" integer,
	"review_type" varchar(50) NOT NULL,
	"verdict" varchar(50) NOT NULL,
	"confidence_adjustment" real,
	"original_content" text,
	"suggested_content" text,
	"suggested_content_ka" text,
	"reasoning" text NOT NULL,
	"reasoning_ka" text,
	"evidence_links" text[],
	"clinical_relevance" varchar(50),
	"safety_implications" varchar(50),
	"is_applied" boolean DEFAULT false,
	"applied_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_feedback_loops" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"source_type" varchar(50) NOT NULL,
	"source_id" integer NOT NULL,
	"feedback_type" varchar(50) NOT NULL,
	"original_prediction" text,
	"actual_outcome" text,
	"accuracy" real,
	"lesson" text NOT NULL,
	"lesson_ka" text,
	"confidence_adjustment" real,
	"affected_memories" integer[],
	"affected_nodes" integer[],
	"affected_hypotheses" integer[],
	"action_taken" varchar(100),
	"applied_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_hypotheses" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"title" text NOT NULL,
	"title_ka" text,
	"hypothesis" text NOT NULL,
	"hypothesis_ka" text,
	"rationale" text NOT NULL,
	"rationale_ka" text,
	"hypothesis_type" varchar(50) NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"novelty_score" real DEFAULT 0.5,
	"testability" varchar(50),
	"supporting_evidence" jsonb,
	"contradicting_evidence" jsonb,
	"related_memories" integer[],
	"related_nodes" integer[],
	"status" varchar(50) DEFAULT 'generated',
	"validation_status" varchar(50),
	"validation_notes" text,
	"expert_review_id" integer,
	"parent_hypothesis_id" integer,
	"child_hypotheses" integer[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_knowledge_contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"shared_knowledge_id" integer,
	"contribution_type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"content_ka" text,
	"language" varchar(10) DEFAULT 'en',
	"status" varchar(50) DEFAULT 'pending',
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_knowledge_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"source_node_id" integer,
	"target_node_id" integer,
	"relation_type" varchar(50) NOT NULL,
	"strength" real DEFAULT 0.5,
	"confidence" integer DEFAULT 50,
	"bidirectional" boolean DEFAULT false,
	"evidence" text[],
	"discovered_by" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_knowledge_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"node_type" varchar(50) NOT NULL,
	"label" text NOT NULL,
	"label_ka" text,
	"description" text,
	"description_ka" text,
	"certainty_level" varchar(20) DEFAULT 'hypothesis',
	"confidence" integer DEFAULT 50,
	"evidence_count" integer DEFAULT 0,
	"validation_count" integer DEFAULT 0,
	"contradiction_count" integer DEFAULT 0,
	"last_validated_at" timestamp,
	"source_ids" text[],
	"embedding" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_knowledge_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"shared_knowledge_id" integer NOT NULL,
	"vote_type" varchar(20) NOT NULL,
	"reason" varchar(100),
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_learning_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"event_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"impact" real DEFAULT 0,
	"affected_node_ids" integer[],
	"affected_memory_ids" integer[],
	"before_state" jsonb,
	"after_state" jsonb,
	"lessons_learned" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"memory_type" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"content" text NOT NULL,
	"content_ka" text,
	"embedding" jsonb,
	"certainty_level" varchar(20) DEFAULT 'hypothesis',
	"confidence" integer DEFAULT 50,
	"access_count" integer DEFAULT 0,
	"last_accessed_at" timestamp,
	"expires_at" timestamp,
	"source_ids" text[],
	"linked_memory_ids" integer[],
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"user_id" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"title_ka" text,
	"message" text NOT NULL,
	"message_ka" text,
	"metadata" jsonb,
	"action_url" varchar(500),
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_outcome_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracking_id" integer NOT NULL,
	"value" text NOT NULL,
	"numeric_value" real,
	"measurement_date" timestamp NOT NULL,
	"measured_by" varchar(255),
	"context" text,
	"attachments" text[],
	"verified" boolean DEFAULT false,
	"verified_by" varchar(255),
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_outcome_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"child_id" integer,
	"recommendation_id" integer,
	"tracking_type" varchar(50) NOT NULL,
	"target_outcome" text NOT NULL,
	"target_outcome_ka" text,
	"baseline_value" text,
	"target_value" text,
	"current_value" text,
	"measurement_unit" varchar(50),
	"measurement_method" varchar(100),
	"frequency" varchar(50) DEFAULT 'weekly',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" varchar(50) DEFAULT 'active',
	"overall_progress" varchar(50),
	"progress_score" real,
	"side_effects" text[],
	"adjustments_made" jsonb,
	"notes" text,
	"notes_ka" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"prometheus_id" integer,
	"prediction_type" varchar(50) NOT NULL,
	"prediction" jsonb NOT NULL,
	"prediction_ka" jsonb,
	"confidence" real DEFAULT 0.5,
	"prediction_date" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"actual_outcome" text,
	"was_accurate" boolean,
	"validated_at" timestamp,
	"related_hypothesis_id" integer,
	"related_recommendation_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_research_priorities" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"topic" text NOT NULL,
	"topic_ka" text,
	"description" text,
	"description_ka" text,
	"priority_score" real DEFAULT 0.5 NOT NULL,
	"urgency" varchar(20) DEFAULT 'medium',
	"relevance_to_child" real DEFAULT 0.5,
	"potential_impact" varchar(50),
	"research_type" varchar(50) NOT NULL,
	"keywords" text[],
	"related_conditions" text[],
	"suggested_sources" text[],
	"estimated_research_time" integer,
	"status" varchar(50) DEFAULT 'pending',
	"completed_at" timestamp,
	"findings" text,
	"findings_ka" text,
	"linked_hypotheses" integer[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_shared_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_prometheus_id" integer,
	"knowledge_type" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"title_ka" text,
	"content" text NOT NULL,
	"content_ka" text,
	"anonymized_context" text,
	"confidence_level" real NOT NULL,
	"verification_status" varchar(50) DEFAULT 'unverified',
	"expert_verification_count" integer DEFAULT 0,
	"community_vote_score" integer DEFAULT 0,
	"upvotes" integer DEFAULT 0,
	"downvotes" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"citation_count" integer DEFAULT 0,
	"source_references" text[],
	"tags" text[],
	"applicable_conditions" text[],
	"age_range_min" integer,
	"age_range_max" integer,
	"is_public" boolean DEFAULT false,
	"published_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"child_id" integer,
	"status" varchar(50) DEFAULT 'initializing',
	"current_phase" varchar(100),
	"total_knowledge_nodes" integer DEFAULT 0,
	"total_memory_items" integer DEFAULT 0,
	"total_learning_events" integer DEFAULT 0,
	"avg_confidence" real DEFAULT 50,
	"prediction_accuracy" real DEFAULT 0,
	"error_rate" real DEFAULT 0,
	"last_consolidation_at" timestamp,
	"last_error_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" integer NOT NULL,
	"source_language" varchar(10) DEFAULT 'en' NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"original_text" text NOT NULL,
	"translated_text" text NOT NULL,
	"translation_method" varchar(50) NOT NULL,
	"translated_by" varchar(255),
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"quality_score" real,
	"medical_terms_verified" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_treatment_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"child_id" integer,
	"treatment_name" text NOT NULL,
	"treatment_name_ka" text,
	"treatment_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"description_ka" text,
	"rationale" text NOT NULL,
	"rationale_ka" text,
	"expected_benefits" text[],
	"expected_benefits_ka" text[],
	"potential_risks" text[],
	"potential_risks_ka" text[],
	"confidence_score" real DEFAULT 0.5 NOT NULL,
	"evidence_level" varchar(50),
	"evidence_sources" jsonb,
	"applicability_score" real DEFAULT 0.5,
	"urgency" varchar(20) DEFAULT 'medium',
	"timeframe" varchar(50),
	"prerequisites" text[],
	"contraindications" text[],
	"interaction_warnings" text[],
	"cost_estimate" varchar(50),
	"availability" varchar(50),
	"status" varchar(50) DEFAULT 'suggested',
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp,
	"review_notes" text,
	"implemented_at" timestamp,
	"outcome_tracking_id" integer,
	"related_hypotheses" integer[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prometheus_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"prometheus_id" integer,
	"target_node_id" integer,
	"method" varchar(50) NOT NULL,
	"passed" boolean NOT NULL,
	"confidence" integer DEFAULT 50,
	"evidence" text[],
	"notes" text,
	"metadata" jsonb,
	"verified_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"monitor_id" integer,
	"finding_type" varchar(50),
	"title" text,
	"summary" text,
	"source_url" text,
	"source_name" varchar(255),
	"relevance_score" real,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"is_saved" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"published_at" timestamp,
	"found_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "research_monitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"patient_profile_id" integer,
	"is_active" boolean DEFAULT false,
	"search_keywords" text[],
	"conditions" text[],
	"monitor_clinical_trials" boolean DEFAULT true,
	"monitor_pubmed" boolean DEFAULT true,
	"monitor_drugs" boolean DEFAULT true,
	"monitor_news" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"notification_frequency" varchar(20) DEFAULT 'daily',
	"last_scan_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"author_name" varchar NOT NULL,
	"author_role" varchar,
	"author_role_ka" varchar,
	"content" text NOT NULL,
	"content_ka" text,
	"rating" integer NOT NULL,
	"is_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "therapies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"child_id" integer,
	"type" varchar,
	"therapist_name" varchar,
	"frequency" varchar,
	"goals" text[],
	"notes" text,
	"is_active" boolean DEFAULT true,
	"start_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "therapy_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"therapy_id" integer,
	"session_date" date,
	"duration" integer,
	"notes" text,
	"progress_rating" integer,
	"ai_insights" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trial_search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"search_query" text NOT NULL,
	"filters" jsonb,
	"results_count" integer,
	"language_code" varchar(10) DEFAULT 'ka',
	"searched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trial_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"trial_id" integer NOT NULL,
	"language_code" varchar(10) NOT NULL,
	"title_translated" text,
	"summary_translated" text,
	"eligibility_translated" text,
	"simplified_summary" text,
	"translation_quality" real,
	"human_reviewed" boolean DEFAULT false,
	"translated_at" timestamp DEFAULT now(),
	"translated_by" varchar(50) DEFAULT 'ai'
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"email_notifications" boolean DEFAULT true,
	"appointment_reminders" boolean DEFAULT true,
	"clinical_trial_alerts" boolean DEFAULT true,
	"data_sharing" boolean DEFAULT false,
	"language" varchar DEFAULT 'en',
	"theme" varchar DEFAULT 'light',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_saved_trials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"trial_id" integer NOT NULL,
	"notes" text,
	"notification_enabled" boolean DEFAULT true,
	"saved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accumulated_knowledge" ADD CONSTRAINT "accumulated_knowledge_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accumulated_knowledge" ADD CONSTRAINT "accumulated_knowledge_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accumulated_knowledge" ADD CONSTRAINT "accumulated_knowledge_origin_cycle_id_evolution_cycles_id_fk" FOREIGN KEY ("origin_cycle_id") REFERENCES "public"."evolution_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accumulated_knowledge" ADD CONSTRAINT "accumulated_knowledge_origin_insight_id_evolution_insights_id_fk" FOREIGN KEY ("origin_insight_id") REFERENCES "public"."evolution_insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_cycles" ADD CONSTRAINT "evolution_cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_cycles" ADD CONSTRAINT "evolution_cycles_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_cycles" ADD CONSTRAINT "evolution_cycles_trigger_document_id_documents_id_fk" FOREIGN KEY ("trigger_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_daily_runs" ADD CONSTRAINT "evolution_daily_runs_cycle_id_evolution_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."evolution_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_insights" ADD CONSTRAINT "evolution_insights_daily_run_id_evolution_daily_runs_id_fk" FOREIGN KEY ("daily_run_id") REFERENCES "public"."evolution_daily_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_report_messages" ADD CONSTRAINT "evolution_report_messages_report_id_evolution_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."evolution_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_report_messages" ADD CONSTRAINT "evolution_report_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_reports" ADD CONSTRAINT "evolution_reports_daily_run_id_evolution_daily_runs_id_fk" FOREIGN KEY ("daily_run_id") REFERENCES "public"."evolution_daily_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evolution_reports" ADD CONSTRAINT "evolution_reports_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_glossary" ADD CONSTRAINT "medical_glossary_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_action_items" ADD CONSTRAINT "nexus_action_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_ai_analyses" ADD CONSTRAINT "nexus_ai_analyses_finding_id_nexus_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."nexus_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_ai_analyses" ADD CONSTRAINT "nexus_ai_analyses_ai_agent_id_nexus_ai_agents_id_fk" FOREIGN KEY ("ai_agent_id") REFERENCES "public"."nexus_ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_debates" ADD CONSTRAINT "nexus_debates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_disciplinary_analyses" ADD CONSTRAINT "nexus_disciplinary_analyses_finding_id_nexus_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."nexus_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_findings" ADD CONSTRAINT "nexus_findings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_findings" ADD CONSTRAINT "nexus_findings_query_id_nexus_research_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."nexus_research_queries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_findings" ADD CONSTRAINT "nexus_findings_evolution_cycle_id_evolution_cycles_id_fk" FOREIGN KEY ("evolution_cycle_id") REFERENCES "public"."evolution_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_hypotheses" ADD CONSTRAINT "nexus_hypotheses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_hypotheses" ADD CONSTRAINT "nexus_hypotheses_evolution_insight_id_evolution_insights_id_fk" FOREIGN KEY ("evolution_insight_id") REFERENCES "public"."evolution_insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_hypotheses" ADD CONSTRAINT "nexus_hypotheses_evolution_cycle_id_evolution_cycles_id_fk" FOREIGN KEY ("evolution_cycle_id") REFERENCES "public"."evolution_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_knowledge_edges" ADD CONSTRAINT "nexus_knowledge_edges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_knowledge_edges" ADD CONSTRAINT "nexus_knowledge_edges_source_id_nexus_knowledge_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."nexus_knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_knowledge_edges" ADD CONSTRAINT "nexus_knowledge_edges_target_id_nexus_knowledge_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."nexus_knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_knowledge_nodes" ADD CONSTRAINT "nexus_knowledge_nodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_research_queries" ADD CONSTRAINT "nexus_research_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_autonomous_actions" ADD CONSTRAINT "prometheus_autonomous_actions_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_clinical_data_imports" ADD CONSTRAINT "prometheus_clinical_data_imports_integration_id_prometheus_clinical_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."prometheus_clinical_integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_clinical_data_imports" ADD CONSTRAINT "prometheus_clinical_data_imports_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_clinical_integrations" ADD CONSTRAINT "prometheus_clinical_integrations_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_consolidation_cycles" ADD CONSTRAINT "prometheus_consolidation_cycles_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_errors" ADD CONSTRAINT "prometheus_errors_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_expert_debates" ADD CONSTRAINT "prometheus_expert_debates_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_expert_reviews" ADD CONSTRAINT "prometheus_expert_reviews_expert_id_prometheus_expert_credentials_id_fk" FOREIGN KEY ("expert_id") REFERENCES "public"."prometheus_expert_credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_expert_reviews" ADD CONSTRAINT "prometheus_expert_reviews_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_feedback_loops" ADD CONSTRAINT "prometheus_feedback_loops_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_hypotheses" ADD CONSTRAINT "prometheus_hypotheses_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_knowledge_contributions" ADD CONSTRAINT "prometheus_knowledge_contributions_shared_knowledge_id_prometheus_shared_knowledge_id_fk" FOREIGN KEY ("shared_knowledge_id") REFERENCES "public"."prometheus_shared_knowledge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_knowledge_contributions" ADD CONSTRAINT "prometheus_knowledge_contributions_reviewed_by_prometheus_expert_credentials_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."prometheus_expert_credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_knowledge_edges" ADD CONSTRAINT "prometheus_knowledge_edges_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_knowledge_edges" ADD CONSTRAINT "prometheus_knowledge_edges_source_node_id_prometheus_knowledge_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."prometheus_knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_knowledge_edges" ADD CONSTRAINT "prometheus_knowledge_edges_target_node_id_prometheus_knowledge_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."prometheus_knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_knowledge_nodes" ADD CONSTRAINT "prometheus_knowledge_nodes_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_knowledge_votes" ADD CONSTRAINT "prometheus_knowledge_votes_shared_knowledge_id_prometheus_shared_knowledge_id_fk" FOREIGN KEY ("shared_knowledge_id") REFERENCES "public"."prometheus_shared_knowledge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_learning_events" ADD CONSTRAINT "prometheus_learning_events_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_memory" ADD CONSTRAINT "prometheus_memory_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_notifications" ADD CONSTRAINT "prometheus_notifications_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_outcome_measurements" ADD CONSTRAINT "prometheus_outcome_measurements_tracking_id_prometheus_outcome_tracking_id_fk" FOREIGN KEY ("tracking_id") REFERENCES "public"."prometheus_outcome_tracking"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_outcome_tracking" ADD CONSTRAINT "prometheus_outcome_tracking_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_outcome_tracking" ADD CONSTRAINT "prometheus_outcome_tracking_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_outcome_tracking" ADD CONSTRAINT "prometheus_outcome_tracking_recommendation_id_prometheus_treatment_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."prometheus_treatment_recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_predictions" ADD CONSTRAINT "prometheus_predictions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_predictions" ADD CONSTRAINT "prometheus_predictions_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_predictions" ADD CONSTRAINT "prometheus_predictions_related_hypothesis_id_prometheus_hypotheses_id_fk" FOREIGN KEY ("related_hypothesis_id") REFERENCES "public"."prometheus_hypotheses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_predictions" ADD CONSTRAINT "prometheus_predictions_related_recommendation_id_prometheus_treatment_recommendations_id_fk" FOREIGN KEY ("related_recommendation_id") REFERENCES "public"."prometheus_treatment_recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_research_priorities" ADD CONSTRAINT "prometheus_research_priorities_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_shared_knowledge" ADD CONSTRAINT "prometheus_shared_knowledge_source_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("source_prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_state" ADD CONSTRAINT "prometheus_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_state" ADD CONSTRAINT "prometheus_state_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_treatment_recommendations" ADD CONSTRAINT "prometheus_treatment_recommendations_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_treatment_recommendations" ADD CONSTRAINT "prometheus_treatment_recommendations_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_verifications" ADD CONSTRAINT "prometheus_verifications_prometheus_id_prometheus_state_id_fk" FOREIGN KEY ("prometheus_id") REFERENCES "public"."prometheus_state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prometheus_verifications" ADD CONSTRAINT "prometheus_verifications_target_node_id_prometheus_knowledge_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."prometheus_knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_monitor_id_research_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."research_monitors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_monitors" ADD CONSTRAINT "research_monitors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_monitors" ADD CONSTRAINT "research_monitors_patient_profile_id_patient_profiles_id_fk" FOREIGN KEY ("patient_profile_id") REFERENCES "public"."patient_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapies" ADD CONSTRAINT "therapies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapies" ADD CONSTRAINT "therapies_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_therapy_id_therapies_id_fk" FOREIGN KEY ("therapy_id") REFERENCES "public"."therapies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_search_history" ADD CONSTRAINT "trial_search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_translations" ADD CONSTRAINT "trial_translations_trial_id_clinical_trials_id_fk" FOREIGN KEY ("trial_id") REFERENCES "public"."clinical_trials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_translations" ADD CONSTRAINT "trial_translations_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_trials" ADD CONSTRAINT "user_saved_trials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_trials" ADD CONSTRAINT "user_saved_trials_trial_id_clinical_trials_id_fk" FOREIGN KEY ("trial_id") REFERENCES "public"."clinical_trials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_trials_nct" ON "clinical_trials" USING btree ("nct_number");--> statement-breakpoint
CREATE INDEX "idx_trials_status" ON "clinical_trials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_trials_phase" ON "clinical_trials" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "idx_glossary_term_lang" ON "medical_glossary" USING btree ("term_english","language_code");--> statement-breakpoint
CREATE INDEX "idx_prometheus_errors_type" ON "prometheus_errors" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "idx_prometheus_errors_resolved" ON "prometheus_errors" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "idx_prometheus_edges_source" ON "prometheus_knowledge_edges" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "idx_prometheus_edges_target" ON "prometheus_knowledge_edges" USING btree ("target_node_id");--> statement-breakpoint
CREATE INDEX "idx_prometheus_edges_relation" ON "prometheus_knowledge_edges" USING btree ("relation_type");--> statement-breakpoint
CREATE INDEX "idx_prometheus_nodes_type" ON "prometheus_knowledge_nodes" USING btree ("node_type");--> statement-breakpoint
CREATE INDEX "idx_prometheus_nodes_prometheus_id" ON "prometheus_knowledge_nodes" USING btree ("prometheus_id");--> statement-breakpoint
CREATE INDEX "idx_prometheus_nodes_certainty" ON "prometheus_knowledge_nodes" USING btree ("certainty_level");--> statement-breakpoint
CREATE INDEX "idx_prometheus_learning_type" ON "prometheus_learning_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_prometheus_learning_impact" ON "prometheus_learning_events" USING btree ("impact");--> statement-breakpoint
CREATE INDEX "idx_prometheus_memory_type" ON "prometheus_memory" USING btree ("memory_type");--> statement-breakpoint
CREATE INDEX "idx_prometheus_memory_priority" ON "prometheus_memory" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_prometheus_memory_prometheus_id" ON "prometheus_memory" USING btree ("prometheus_id");--> statement-breakpoint
CREATE INDEX "idx_findings_monitor" ON "research_findings" USING btree ("monitor_id");--> statement-breakpoint
CREATE INDEX "idx_findings_type" ON "research_findings" USING btree ("finding_type");--> statement-breakpoint
CREATE INDEX "idx_findings_read" ON "research_findings" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_translations_trial_lang" ON "trial_translations" USING btree ("trial_id","language_code");--> statement-breakpoint
CREATE INDEX "idx_saved_trials_user" ON "user_saved_trials" USING btree ("user_id");