# syntax=docker/dockerfile:1
FROM golang:1.23-alpine AS builder
WORKDIR /app
RUN apk add --no-cache build-base
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /bin/maqzone-api ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl
WORKDIR /app
COPY --from=builder /bin/maqzone-api /usr/local/bin/maqzone-api
ENV PORT=8080
ENV SQLITE_PATH=/data/maqzone.db
EXPOSE 8080
CMD ["maqzone-api"]
