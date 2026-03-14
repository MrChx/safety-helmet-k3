package handlers

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"k3guard/internal/domain"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true //izinkan fe
	},
}

type DetectionHandler struct {
	uc      domain.DetectionUseCase
	clients map[*websocket.Conn]bool
	mu      sync.Mutex
} // tangani websocket

func NewDetectionHandler(uc domain.DetectionUseCase) *DetectionHandler {
	return &DetectionHandler{
		uc:      uc,
		clients: make(map[*websocket.Conn]bool),
	}
}

func (h *DetectionHandler) HandleWebSocket(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Gagal melakukan upgrade websocket: %v", err)
		return
	}
	defer ws.Close()

	h.mu.Lock()
	h.clients[ws] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients, ws)
		h.mu.Unlock()
	}()

	log.Printf("[WebRTC/WebSocket] Koneksi Client React Terhubung. IP: %s", c.ClientIP())

	for {
		messageType, p, err := ws.ReadMessage()
		if err != nil {
			log.Println("[WebRTC/WebSocket] Client terputus.")
			break
		}

		if messageType == websocket.TextMessage {
			frameDataBase64 := string(p)

			result, err := h.uc.ProcessFrameStream(frameDataBase64)
			if err != nil {
				log.Printf("Error processing frame: %v", err)
				continue
			}

			err = ws.WriteJSON(result)
			if err != nil {
				log.Printf("Error writing websocket result: %v", err)
				break
			}
		}
	}
}

func (h *DetectionHandler) HandlePing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "Online",
		"service": "K3Guard Live Monitor Gateway",
		"time":    time.Now().Format(time.RFC3339),
	})
}
