package domain

type BoundingBox struct {
	X1         float64 `json:"x1"`
	Y1         float64 `json:"y1"`
	Width      float64 `json:"width"`
	Height     float64 `json:"height"`
	Label      string  `json:"label"`
	Confidence float64 `json:"confidence"`
}

type DetectionResult struct {
	Total      int           `json:"total"`
	Safe       int           `json:"safe"`
	Danger     int           `json:"danger"`
	Confidence float64       `json:"confidence"`
	Boxes      []BoundingBox `json:"boxes"`
	ImageURL   string        `json:"imageUrl,omitempty"`
}

type DetectionUseCase interface {
	ProcessFrameStream(frameData string) (*DetectionResult, error)
}
