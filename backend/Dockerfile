FROM golang:alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /api_server cmd/api/main.go

FROM alpine:latest

WORKDIR /app

# Menyalin executable dari stage builder
COPY --from=builder /api_server /api_server

EXPOSE 7860
ENV PORT=7860

CMD ["/api_server"]
