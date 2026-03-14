package routes

import (
	"github.com/gin-gonic/gin"

	"k3guard/internal/delivery/http/handlers"
)

func SetupRouter(detectionHandler *handlers.DetectionHandler) *gin.Engine {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

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
