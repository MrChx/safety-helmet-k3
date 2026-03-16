package mlclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"k3guard/internal/domain"
)

type MLClient interface {
	SendFrameForDetection(base64Image string) (*domain.DetectionResult, error)
}

type FastAPIMLClient struct {
	client     *http.Client
	pythonHost string
}

func NewFastAPIMLClient() *FastAPIMLClient {
	mlURL := os.Getenv("ML_SERVICE_URL")
	if mlURL == "" {
		mlURL = "http://localhost:5000"
	}

	return &FastAPIMLClient{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		pythonHost: mlURL,
	}
}

type FrameRequest struct {
	ImageBase64 string `json:"image_base64"`
}

func (m *FastAPIMLClient) SendFrameForDetection(base64Image string) (*domain.DetectionResult, error) {

	reqBody := FrameRequest{ImageBase64: base64Image}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/api/predict", m.pythonHost)
	resp, err := m.client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("[ML Client] Gagal menghubungi server Python: %v", err)
		return nil, fmt.Errorf("gagal menghubungi python ML service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("python service merespons HTTP %d", resp.StatusCode)
	}

	var result domain.DetectionResult
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca balasan JSON python: %w", err)
	}

	return &result, nil
}
