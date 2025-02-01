-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    quiz_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    score DECIMAL(5,2),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id),
    question_id UUID NOT NULL,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(attempt_id, question_id)
); 