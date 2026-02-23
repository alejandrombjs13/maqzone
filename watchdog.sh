#!/bin/bash
# MAQZONE Watchdog — verifica cada 60s que todos los servicios estén activos
# Instalación: deploy.sh lo instala automáticamente como servicio systemd
# Manual:      bash watchdog.sh

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="${COMPOSE_DIR}/watchdog.log"
MAX_LOG_LINES=2000
DISK_ALERT_PCT=85   # % de disco libre a partir del cual limpia Docker
BACKUPS_DIR="${COMPOSE_DIR}/backups"

log() {
  local line
  line="$(date '+%Y-%m-%d %H:%M:%S') $1"
  echo "$line"
  echo "$line" >> "$LOG"
  local lines
  lines=$(wc -l < "$LOG" 2>/dev/null || echo 0)
  if [ "$lines" -gt "$MAX_LOG_LINES" ]; then
    tail -n $((MAX_LOG_LINES / 2)) "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
  fi
}

container_health() {
  docker inspect "$1" --format '{{.State.Health.Status}}' 2>/dev/null || echo "none"
}

container_status() {
  docker inspect "$1" --format '{{.State.Status}}' 2>/dev/null || echo "none"
}

restart_stack() {
  log "INFO: Reiniciando stack completo..."
  cd "$COMPOSE_DIR"
  docker compose -f "$COMPOSE_FILE" down --timeout 10
  sleep 3
  docker compose -f "$COMPOSE_FILE" up -d
  sleep 20
  log "INFO: Reinicio completo."
}

log "INFO: Watchdog iniciado (compose: $COMPOSE_FILE)"
mkdir -p "$BACKUPS_DIR"

while true; do
  cd "$COMPOSE_DIR"

  # ── 0. Disco lleno — limpiar antes de que cause problemas ──────
  DISK_PCT=$(df / --output=pcent 2>/dev/null | tail -1 | tr -d ' %')
  if [ "${DISK_PCT:-0}" -ge "$DISK_ALERT_PCT" ]; then
    log "WARN: Disco al ${DISK_PCT}%. Limpiando imágenes Docker huérfanas..."
    docker system prune -f --filter "until=24h" >> "$LOG" 2>&1
  fi

  # ── 1. Verificar que los 3 contenedores estén corriendo ────────
  for svc in maqzone-backend-1 maqzone-web-1 maqzone-caddy-1; do
    STATUS=$(container_status "$svc")
    if [ "$STATUS" != "running" ]; then
      log "WARN: Contenedor $svc no está corriendo (estado: $STATUS). Reiniciando stack..."
      restart_stack
      continue 2
    fi
  done

  # ── 2. Health check del backend (via Docker healthcheck) ───────
  BACKEND_HEALTH=$(container_health "maqzone-backend-1")
  if [ "$BACKEND_HEALTH" = "unhealthy" ]; then
    log "WARN: Backend unhealthy. Reiniciando backend..."
    docker compose -f "$COMPOSE_FILE" restart backend
    sleep 20
    if [ "$(container_health maqzone-backend-1)" = "unhealthy" ]; then
      log "ERROR: Backend no recuperó. Reiniciando stack completo..."
      restart_stack
    else
      log "INFO: Backend recuperado OK."
    fi
    continue
  fi

  # ── 3. Health check del frontend (via Docker healthcheck) ──────
  WEB_HEALTH=$(container_health "maqzone-web-1")
  if [ "$WEB_HEALTH" = "unhealthy" ]; then
    log "WARN: Web unhealthy. Reiniciando web..."
    docker compose -f "$COMPOSE_FILE" restart web
    sleep 25
    if [ "$(container_health maqzone-web-1)" = "unhealthy" ]; then
      log "ERROR: Web no recuperó. Reiniciando stack completo..."
      restart_stack
    else
      log "INFO: Web recuperado OK."
    fi
    continue
  fi

  sleep 60
done
