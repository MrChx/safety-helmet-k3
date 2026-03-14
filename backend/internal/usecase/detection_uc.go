package usecase

import (
	"errors"

	"k3guard/internal/domain"
	"k3guard/pkg/mlclient"
)

type detectionUseCase struct {
	mlSvc mlclient.MLClient
}

func NewDetectionUseCase(m mlclient.MLClient) domain.DetectionUseCase {
	return &detectionUseCase{
		mlSvc: m,
	}
}

func (uc *detectionUseCase) ProcessFrameStream(frameData string) (*domain.DetectionResult, error) {
	if frameData == "" {
		return nil, errors.New("frame data kosong")
	}

	result, err := uc.mlSvc.SendFrameForDetection(frameData)
	if err != nil {
		return nil, err
	}

	return result, nil
}
