-- Drop indexes first
DROP INDEX IF EXISTS idx_generation_feedback_user_id;
DROP INDEX IF EXISTS idx_generation_feedback_generation_id;

DROP INDEX IF EXISTS idx_generations_created_at;
DROP INDEX IF EXISTS idx_generations_model_used;
DROP INDEX IF EXISTS idx_generations_prompt_template_id;
DROP INDEX IF EXISTS idx_generations_user_id;

DROP INDEX IF EXISTS idx_prompt_templates_category;

DROP INDEX IF EXISTS idx_ai_interactions_created_at;
DROP INDEX IF EXISTS idx_ai_interactions_model_id;
DROP INDEX IF EXISTS idx_ai_interactions_user_id;

-- Drop tables in reverse order of creation (to handle foreign key constraints)
DROP TABLE IF EXISTS generation_feedback;
DROP TABLE IF EXISTS generations;
DROP TABLE IF EXISTS ai_interactions;
DROP TABLE IF EXISTS prompt_templates;
DROP TABLE IF EXISTS ai_models; 