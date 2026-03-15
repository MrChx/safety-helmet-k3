package routes

import (
	"time" // Added for time.Hour
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors" // Added for CORS middleware

	"k3guard/internal/delivery/http/handlers"
)

func SetupRouter(detectionHandler *handlers.DetectionHandler) *gin.Engine {
	r := gin.Default()

	// CORS Middleware (Disiapkan untuk Vercel / Production Layer)
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api/v1")
	{
		api.GET("/ping", detectionHandler.HandlePing)
		// Tambah routes API lain di sini nanti
	}

	ws := r.Group("/ws")
	{
		ws.GET("/detect", detectionHandler.HandleWebSocket)
	}

	return r
}
