-- Create databases for each service
CREATE DATABASE IF NOT EXISTS quizapp_users;
CREATE DATABASE IF NOT EXISTS quizapp_content;
CREATE DATABASE IF NOT EXISTS quizapp_ai;
CREATE DATABASE IF NOT EXISTS quizapp_study;

-- Connect to users database
\c quizapp_users;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    study_reminder_frequency VARCHAR(20) DEFAULT 'daily',
    preferred_ai_model VARCHAR(50) DEFAULT 'gpt-4',
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Connect to content database
\c quizapp_content;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE content_type AS ENUM ('flashcard', 'quiz', 'note');
CREATE TYPE visibility_type AS ENUM ('private', 'public', 'shared');

CREATE TABLE IF NOT EXISTS study_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    visibility visibility_type DEFAULT 'private',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_set_id UUID REFERENCES study_sets(id) ON DELETE CASCADE,
    content_type content_type NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    hints TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared_access (
    study_set_id UUID REFERENCES study_sets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    access_type VARCHAR(20) DEFAULT 'read',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (study_set_id, user_id)
);

-- Connect to AI database
\c quizapp_ai;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    model_id UUID REFERENCES ai_models(id),
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INTEGER,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Connect to study database
\c quizapp_study;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE study_session_status AS ENUM ('in_progress', 'completed', 'abandoned');

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    study_set_id UUID NOT NULL,
    status study_session_status DEFAULT 'in_progress',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    items_reviewed INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS progress_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    content_item_id UUID NOT NULL,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
    last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_review TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, content_item_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON quizapp_users.public.users(email);
CREATE INDEX idx_users_username ON quizapp_users.public.users(username);
CREATE INDEX idx_study_sets_owner ON quizapp_content.public.study_sets(owner_id);
CREATE INDEX idx_content_items_study_set ON quizapp_content.public.content_items(study_set_id);
CREATE INDEX idx_progress_user_content ON quizapp_study.public.progress_tracking(user_id, content_item_id);
CREATE INDEX idx_study_sessions_user ON quizapp_study.public.study_sessions(user_id);
CREATE INDEX idx_ai_interactions_user ON quizapp_ai.public.ai_interactions(user_id); 