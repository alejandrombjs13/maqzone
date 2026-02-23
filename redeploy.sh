#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MAQZONE — Redeploy rápido
# Uso en el VPS: bash redeploy.sh
# La base de datos (volumen Docker) NO se toca.
# ─────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="docker compose -f ${DEPLOY_DIR}/docker-compose.prod.yml"

log_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
log_info() { echo -e "${CYAN}▸ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
log_err()  { echo -e "${RED}✗ $1${NC}"; }

cd "$DEPLOY_DIR"

# ── 1. Backup rápido antes de rebuild ────────────────────────
log_info "Backup de seguridad antes del deploy..."
mkdir -p "${DEPLOY_DIR}/backups"
$COMPOSE exec -T backend sh -c \
  'sqlite3 /data/maqzone.db ".backup /backups/pre-deploy.db"' 2>/dev/null \
  && log_ok "Backup guardado en backups/pre-deploy.db" \
  || log_warn "No se pudo hacer backup (¿backend no corre?). Continuando..."

# ── 2. Pull del código nuevo ──────────────────────────────────
log_info "Descargando cambios de git..."
git pull
log_ok "Código actualizado"

# ── 3. Rebuild y reiniciar contenedores ──────────────────────
log_info "Reconstruyendo y reiniciando servicios..."
$COMPOSE up -d --build
log_ok "Servicios actualizados"

# ── 4. Esperar y verificar ────────────────────────────────────
log_info "Verificando salud de servicios (15s)..."
sleep 15

if $COMPOSE ps 2>/dev/null | grep -qE "unhealthy|Exit [^0]|exited"; then
  echo ""
  log_err "Algún servicio con problemas:"
  $COMPOSE ps
  echo ""
  echo "  Ver logs: $COMPOSE logs --tail=50"
  exit 1
else
  log_ok "Todos los servicios corriendo"
fi

echo ""
echo -e "${GREEN}  Deploy completo. https://maqzone.tech${NC}"
echo ""
