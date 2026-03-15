package routes

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"k3guard/internal/delivery/http/handlers"
)

func SetupRouter(detectionHandler *handlers.DetectionHandler) *gin.Engine {
	r := gin.Default()

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
	}

	ws := r.Group("/ws")
	{
		ws.GET("/detect", detectionHandler.HandleWebSocket)
	}

	return r
}
