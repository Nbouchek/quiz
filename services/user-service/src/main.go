package main

import (
    "log"
    "github.com/gin-gonic/gin"
)

func main() {
    log.Printf("Starting user-service...")
    r := gin.Default()
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "healthy",
            "service": "user-service",
        })
    })
    r.Run(":8080")
}
