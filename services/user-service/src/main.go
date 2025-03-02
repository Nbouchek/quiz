package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
    ID           uuid.UUID  `json:"id"`
    Email        string     `json:"email"`
    Username     string     `json:"username"`
    PasswordHash string     `json:"-"`
    Password     string     `json:"password,omitempty"`
    FullName     string     `json:"full_name"`
    CreatedAt    time.Time  `json:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at"`
    LastLogin    *time.Time `json:"last_login,omitempty"`
}

type UserPreferences struct {
    UserID               uuid.UUID `json:"user_id"`
    StudyReminderFreq    string    `json:"study_reminder_frequency"`
    PreferredAIModel     string    `json:"preferred_ai_model"`
    EmailNotifications   bool      `json:"email_notifications"`
    CreatedAt           time.Time `json:"created_at"`
    UpdatedAt           time.Time `json:"updated_at"`
}

func main() {
    log.Printf("Starting user-service...")

    // Database configuration
    dbHost := os.Getenv("DB_HOST")
    if dbHost == "" {
        dbHost = "postgres"
    }
    dbPort := os.Getenv("DB_PORT")
    if dbPort == "" {
        dbPort = "5432"
    }
    dbUser := os.Getenv("DB_USER")
    if dbUser == "" {
        dbUser = "postgres"
    }
    dbPassword := os.Getenv("DB_PASSWORD")
    if dbPassword == "" {
        dbPassword = "postgres"
    }
    dbName := os.Getenv("DB_NAME")
    if dbName == "" {
        dbName = "quizapp_users"
    }

    // Create database connection string
    dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
        dbUser, dbPassword, dbHost, dbPort, dbName)

    // Connect to database
    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatalf("Error connecting to database: %v", err)
    }
    defer db.Close()

    // Test database connection
    if err := db.Ping(); err != nil {
        log.Fatalf("Error pinging database: %v", err)
    }
    log.Printf("Successfully connected to database")

    // Run database migrations
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        log.Fatalf("Could not create migration driver: %v", err)
    }

    migrationsPath := filepath.Join("migrations")
    m, err := migrate.NewWithDatabaseInstance(
        fmt.Sprintf("file://%s", migrationsPath),
        "postgres",
        driver,
    )
    if err != nil {
        log.Fatalf("Error creating migration instance: %v", err)
    }

    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        log.Fatalf("Error running migrations: %v", err)
    }
    log.Printf("Successfully ran database migrations")

    // Initialize Gin router
    r := gin.Default()

    // Add CORS middleware
    r.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005", "http://localhost:3006", "http://localhost:3007"},
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Content-Type", "Content-Length", "Accept-Encoding", "Authorization", "X-Requested-With", "Accept", "Origin", "X-CSRF-Token", "Cache-Control"},
        AllowCredentials: true,
        MaxAge:           12 * time.Hour,
    }))

    // Health check endpoint
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "healthy",
            "service": "user-service",
        })
    })

    // User registration endpoint
    r.POST("/register", func(c *gin.Context) {
        var user User
        if err := c.ShouldBindJSON(&user); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        // Hash password
        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
            return
        }

        // Create new user
        now := time.Now().UTC()
        user.ID = uuid.New()
        user.PasswordHash = string(hashedPassword)
        user.CreatedAt = now
        user.UpdatedAt = now

        // Insert user into database
        _, err = db.Exec(`
            INSERT INTO users (id, email, username, password_hash, full_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, user.ID, user.Email, user.Username, user.PasswordHash, user.FullName, user.CreatedAt, user.UpdatedAt)

        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
            return
        }

        // Clear sensitive data before sending response
        user.Password = ""
        user.PasswordHash = ""

        c.JSON(http.StatusCreated, gin.H{
            "message": "User created successfully",
            "user": user,
        })
    })

    // Get user by ID endpoint
    r.GET("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        userID, err := uuid.Parse(id)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
            return
        }

        var user User
        err = db.QueryRow(`
            SELECT id, email, username, full_name, created_at, updated_at, last_login
            FROM users WHERE id = $1
        `, userID).Scan(
            &user.ID,
            &user.Email,
            &user.Username,
            &user.FullName,
            &user.CreatedAt,
            &user.UpdatedAt,
            &user.LastLogin,
        )

        if err == sql.ErrNoRows {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"user": user})
    })

    // Update user endpoint
    r.PUT("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        userID, err := uuid.Parse(id)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
            return
        }

        var updateData User
        if err := c.ShouldBindJSON(&updateData); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        // Update user in database
        now := time.Now().UTC()
        result, err := db.Exec(`
            UPDATE users
            SET email = $1, username = $2, full_name = $3, updated_at = $4
            WHERE id = $5
        `, updateData.Email, updateData.Username, updateData.FullName, now, userID)

        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
            return
        }

        rowsAffected, err := result.RowsAffected()
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get update result"})
            return
        }

        if rowsAffected == 0 {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"message": "User updated successfully"})
    })

    // Delete user endpoint
    r.DELETE("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        userID, err := uuid.Parse(id)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
            return
        }

        result, err := db.Exec("DELETE FROM users WHERE id = $1", userID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
            return
        }

        rowsAffected, err := result.RowsAffected()
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get delete result"})
            return
        }

        if rowsAffected == 0 {
            c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
    })

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    log.Printf("Starting HTTP server on port %s", port)
    if err := r.Run(":" + port); err != nil {
        log.Fatalf("Error starting server: %v", err)
    }
}
