-- AI Models table
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(100) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Prompt Templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    template_text TEXT NOT NULL,
    parameters TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(name, category)
);

-- AI Interactions table
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    model_id UUID NOT NULL REFERENCES ai_models(id),
    type VARCHAR(50) NOT NULL,
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    duration_ms BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT valid_status CHECK (status IN ('success', 'error'))
);

-- Generations table
CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    prompt_template_id UUID NOT NULL REFERENCES prompt_templates(id),
    input_params JSONB NOT NULL,
    generated_content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    model_used UUID NOT NULL REFERENCES ai_models(id),
    tokens_used INTEGER NOT NULL,
    duration_ms BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT valid_generation_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Generation Feedback table
CREATE TABLE IF NOT EXISTS generation_feedback (
    id UUID PRIMARY KEY,
    generation_id UUID NOT NULL REFERENCES generations(id),
    user_id UUID NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 5)
);

-- Create indexes for better query performance
CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_model_id ON ai_interactions(model_id);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at);

CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);

CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_prompt_template_id ON generations(prompt_template_id);
CREATE INDEX idx_generations_model_used ON generations(model_used);
CREATE INDEX idx_generations_created_at ON generations(created_at);

CREATE INDEX idx_generation_feedback_generation_id ON generation_feedback(generation_id);
CREATE INDEX idx_generation_feedback_user_id ON generation_feedback(user_id); 