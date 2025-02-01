-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_study_sets_owner;
DROP INDEX IF EXISTS idx_content_items_study_set;
DROP INDEX IF EXISTS idx_progress_user_content;
DROP INDEX IF EXISTS idx_study_sessions_user;
DROP INDEX IF EXISTS idx_ai_interactions_user;

-- Drop tables
DROP TABLE IF EXISTS progress_tracking;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS ai_interactions;
DROP TABLE IF EXISTS ai_models;
DROP TABLE IF EXISTS shared_access;
DROP TABLE IF EXISTS content_items;
DROP TABLE IF EXISTS study_sets;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS users;

-- Drop types
DROP TYPE IF EXISTS study_session_status;
DROP TYPE IF EXISTS content_type;
DROP TYPE IF EXISTS visibility_type;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp"; 