#!/bin/bash
# MAQZONE Watchdog — verifica cada 60s que todos los servicios estén activos
# Instalación: deploy.sh lo instala automáticamente como servicio systemd
# Manual:      bash watchdog.sh

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="${COMPOSE_DIR}/watchdog.log"
MAX_LOG_LINES=2000

log() {
  local line
  line="$(date '+%Y-%m-%d %H:%M:%S') $1"
  echo "$line"
  echo "$line" >> "$LOG"
  # Rotar log cuando pasa de MAX_LOG_LINES
  local lines
  lines=$(wc -l < "$LOG" 2>/dev/null || echo 0)
  if [ "$lines" -gt "$MAX_LOG_LINES" ]; then
    tail -n $((MAX_LOG_LINES / 2)) "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
  fi
}

restart_stack() {
  log "INFO: Reiniciando stack completo..."
  cd "$COMPOSE_DIR"
  docker compose -f "$COMPOSE_FILE" down --timeout 10
  sleep 3
  docker compose -f "$COMPOSE_FILE" up -d
  sleep 15
  log "INFO: Reinicio completo."
}

log "INFO: Watchdog iniciado (compose: $COMPOSE_FILE)"

while true; do
  cd "$COMPOSE_DIR"

  # ── 1. Verificar que los contenedores estén corriendo ──────────
  EXPECTED=3  # caddy + backend + web
  RUNNING=$(docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -c "running" || echo 0)

  if [ "$RUNNING" -lt "$EXPECTED" ]; then
    log "WARN: Solo $RUNNING/$EXPECTED contenedores activos. Reiniciando..."
    restart_stack
    continue
  fi

  # ── 2. Health check del backend ────────────────────────────────
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost/api/health 2>/dev/null)
  if [ "$HTTP_CODE" != "200" ]; then
    log "WARN: Backend health check falló (HTTP $HTTP_CODE). Reiniciando backend..."
    docker compose -f "$COMPOSE_FILE" restart backend
    sleep 15
    # Re-verificar
    HTTP_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost/api/health 2>/dev/null)
    if [ "$HTTP_CODE2" != "200" ]; then
      log "ERROR: Backend no recuperó (HTTP $HTTP_CODE2). Reiniciando stack completo..."
      restart_stack
    else
      log "INFO: Backend recuperado OK."
    fi
    continue
  fi

  # ── 3. Health check del frontend ───────────────────────────────
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost/ 2>/dev/null)
  if [ "$HTTP_CODE" != "200" ]; then
    log "WARN: Frontend health check falló (HTTP $HTTP_CODE). Reiniciando web..."
    docker compose -f "$COMPOSE_FILE" restart web
    sleep 20
    HTTP_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost/ 2>/dev/null)
    if [ "$HTTP_CODE2" != "200" ]; then
      log "ERROR: Frontend no recuperó. Reiniciando stack completo..."
      restart_stack
    else
      log "INFO: Frontend recuperado OK."
    fi
    continue
  fi

  sleep 60
done
