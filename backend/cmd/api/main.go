package main

import (
	"log"

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

	port := "8081"
	log.Printf("Server berjalan di port http://localhost:%s", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
