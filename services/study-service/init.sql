-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS quizapp_study;

-- Connect to the database
\c quizapp_study;

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL,
    user_id UUID NOT NULL,
    score INTEGER,
    total_questions INTEGER NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create quiz_attempt_questions table
CREATE TABLE IF NOT EXISTS quiz_attempt_questions (
    attempt_id UUID REFERENCES quiz_attempts(id),
    question_id UUID NOT NULL,
    PRIMARY KEY (attempt_id, question_id)
);

-- Create quiz_attempt_answers table
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    attempt_id UUID REFERENCES quiz_attempts(id),
    question_id UUID NOT NULL,
    answer TEXT NOT NULL,
    PRIMARY KEY (attempt_id, question_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id); 