package main

import (
	"log"
	"os"

	"k3guard/internal/delivery/http/handlers"
	"k3guard/internal/delivery/http/routes"
	"k3guard/internal/usecase"
	"k3guard/pkg/mlclient"
)

func main() {
	mlSvc := mlclient.NewFastAPIMLClient()

	detectionUC := usecase.NewDetectionUseCase(mlSvc)

	detectionHandler := handlers.NewDetectionHandler(detectionUC)

	r := routes.SetupRouter(detectionHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081" // Local fallback
	}

	log.Printf("Server berjalan di port http://0.0.0.0:%s", port)

	if err := r.Run("0.0.0.0:" + port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
