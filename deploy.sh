#!/bin/bash
# ─────────────────────────────────────────────────────────────
# MAQZONE — Script de despliegue
# Uso (primera vez): bash deploy.sh
# Uso (actualizar):  git pull && bash deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="docker compose -f ${DEPLOY_DIR}/docker-compose.prod.yml"

log_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
log_info() { echo -e "${CYAN}▸ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
log_err()  { echo -e "${RED}✗ $1${NC}"; }

echo ""
echo -e "${CYAN}  ███╗   ███╗ █████╗  ██████╗ ███████╗ ██████╗ ███╗   ██╗███████╗${NC}"
echo -e "${CYAN}  ████╗ ████║██╔══██╗██╔═══██╗╚══███╔╝██╔═══██╗████╗  ██║██╔════╝${NC}"
echo -e "${CYAN}  ██╔████╔██║███████║██║   ██║  ███╔╝ ██║   ██║██╔██╗ ██║█████╗  ${NC}"
echo -e "${CYAN}  ██║╚██╔╝██║██╔══██║██║▄▄ ██║ ███╔╝  ██║   ██║██║╚██╗██║██╔══╝  ${NC}"
echo -e "${CYAN}  ██║ ╚═╝ ██║██║  ██║╚██████╔╝███████╗╚██████╔╝██║ ╚████║███████╗${NC}"
echo -e "${CYAN}  ╚═╝     ╚═╝╚═╝  ╚═╝ ╚══▀▀═╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝${NC}"
echo ""

# ── 1. Solo Linux ─────────────────────────────────────────────
if [[ "$OSTYPE" != "linux"* ]]; then
  log_err "Este script es para Linux (tu VPS). En Mac usa docker-compose.yml para dev."
  exit 1
fi

cd "$DEPLOY_DIR"

# ── 2. Crear swap si hay poca RAM ─────────────────────────────
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')

if [[ "$TOTAL_RAM_MB" -lt 2048 && "$SWAP_MB" -lt 512 ]]; then
  log_info "RAM: ${TOTAL_RAM_MB}MB — creando swap de 2GB para el build..."
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile && mkswap /swapfile -q && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  log_ok "Swap 2GB creado"
else
  log_ok "RAM disponible: ${TOTAL_RAM_MB}MB"
fi

# ── 3. Instalar Docker si no está ────────────────────────────
if ! command -v docker &>/dev/null; then
  log_info "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
  log_ok "Docker instalado"
else
  log_ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1) disponible"
fi

# ── 4. Crear .env si no existe ────────────────────────────────
if [ ! -f "${DEPLOY_DIR}/.env" ]; then
  echo ""
  log_info "Configurando variables de entorno..."
  echo ""

  read -p "  Dominio sin https:// (ej: maqzone.mx): " DOMAIN_INPUT
  while [[ -z "$DOMAIN_INPUT" ]]; do
    log_warn "El dominio no puede estar vacío."
    read -p "  Dominio: " DOMAIN_INPUT
  done

  ADMIN_TOKEN_GEN=$(openssl rand -hex 32)
  JWT_SECRET_GEN=$(openssl rand -hex 64)

  cat > "${DEPLOY_DIR}/.env" <<EOF
DOMAIN=${DOMAIN_INPUT}
ADMIN_TOKEN=${ADMIN_TOKEN_GEN}
JWT_SECRET=${JWT_SECRET_GEN}
EOF

  echo ""
  echo -e "${GREEN}  ┌──────────────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}  │  GUARDA ESTO EN UN LUGAR SEGURO — NO LO COMPARTAS   │${NC}"
  echo -e "${GREEN}  ├──────────────────────────────────────────────────────┤${NC}"
  echo -e "${GREEN}  │  Dominio:     ${DOMAIN_INPUT}                        ${NC}"
  echo -e "${GREEN}  │  ADMIN_TOKEN: ${ADMIN_TOKEN_GEN:0:24}...             ${NC}"
  echo -e "${GREEN}  │  Admin login: admin@maqzone.mx / Admin123!           │${NC}"
  echo -e "${GREEN}  │  (Cambia la contraseña al primer acceso)             │${NC}"
  echo -e "${GREEN}  └──────────────────────────────────────────────────────┘${NC}"
  echo ""
  read -p "  Presiona Enter para continuar..."
else
  log_ok ".env existente encontrado"
  DOMAIN_INPUT=$(grep '^DOMAIN=' "${DEPLOY_DIR}/.env" | cut -d'=' -f2)
fi

# ── 5. Validar .env ───────────────────────────────────────────
for VAR in DOMAIN ADMIN_TOKEN JWT_SECRET; do
  VAL=$(grep "^${VAR}=" "${DEPLOY_DIR}/.env" 2>/dev/null | cut -d'=' -f2)
  if [[ -z "$VAL" || "$VAL" == "cambia_esto"* ]]; then
    log_err "Variable ${VAR} no configurada en .env"
    exit 1
  fi
done
log_ok "Variables de entorno válidas"

# ── 6. Verificar DNS ──────────────────────────────────────────
echo ""
log_info "Verificando DNS para ${DOMAIN_INPUT}..."
SERVER_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || \
            curl -s --max-time 5 https://ifconfig.me 2>/dev/null || echo "")
DOMAIN_IP=$(getent hosts "${DOMAIN_INPUT}" 2>/dev/null | awk '{print $1}' | head -1 || echo "")

if [[ -n "$SERVER_IP" && "$DOMAIN_IP" == "$SERVER_IP" ]]; then
  log_ok "DNS correcto: ${DOMAIN_INPUT} → ${SERVER_IP}"
elif [[ -z "$DOMAIN_IP" ]]; then
  log_warn "${DOMAIN_INPUT} no resuelve. Crea un registro A apuntando a: ${SERVER_IP:-<este servidor>}"
  read -p "  Continuar sin DNS correcto? (s/N): " C && [[ "$C" != "s" && "$C" != "S" ]] && exit 0
else
  log_warn "${DOMAIN_INPUT} → ${DOMAIN_IP} (este servidor: ${SERVER_IP})"
  log_warn "El SSL no funcionará hasta que el DNS apunte aquí."
  read -p "  Continuar de todas formas? (s/N): " C && [[ "$C" != "s" && "$C" != "S" ]] && exit 0
fi

# ── 7. Crear directorio de backups ────────────────────────────
mkdir -p "${DEPLOY_DIR}/backups"
log_ok "Directorio backups/ listo"

# ── 8. Construir y levantar ───────────────────────────────────
echo ""
log_info "Construyendo y levantando servicios..."
log_info "(Primera vez: 3-5 minutos)"
echo ""

$COMPOSE up -d --build

# ── 9. Esperar y verificar salud ─────────────────────────────
echo ""
log_info "Verificando servicios (espera 20s)..."
sleep 20

BACKEND_OK=false
for i in 1 2 3 4 5; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost/api/health" 2>/dev/null || echo "0")
  if [[ "$CODE" == "200" ]]; then
    BACKEND_OK=true
    break
  fi
  sleep 5
done

if $COMPOSE ps 2>/dev/null | grep -q "unhealthy\|Exit\|exited"; then
  echo ""
  log_err "Algunos servicios tienen problemas:"
  $COMPOSE ps
  echo ""
  echo "  Revisa logs: $COMPOSE logs --tail=50"
elif ! $BACKEND_OK; then
  log_warn "Backend tardando en arrancar. Verifica: $COMPOSE logs backend"
else
  log_ok "Todos los servicios corriendo"
fi

# ── 10. Watchdog como servicio systemd ────────────────────────
echo ""
log_info "Instalando watchdog de resiliencia..."
cat > /etc/systemd/system/maqzone-watchdog.service <<SVCEOF
[Unit]
Description=MAQZONE Watchdog
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=${DEPLOY_DIR}
Environment=COMPOSE_FILE=docker-compose.prod.yml
ExecStart=/bin/bash ${DEPLOY_DIR}/watchdog.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable maqzone-watchdog
systemctl restart maqzone-watchdog
log_ok "Watchdog activo como servicio systemd"

# ── 11. Cron de backup diario ─────────────────────────────────
log_info "Configurando backup diario de base de datos..."
# Usa docker compose exec para no depender del nombre del volumen
BACKUP_CMD="0 3 * * * cd ${DEPLOY_DIR} && docker compose -f docker-compose.prod.yml exec -T backend sh -c 'sqlite3 /data/maqzone.db \".backup /backups/maqzone_\$(date +%%Y%%m%%d).db\"' && ls -t ${DEPLOY_DIR}/backups/maqzone_*.db 2>/dev/null | tail -n +8 | xargs rm -f >> /var/log/maqzone-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'maqzone.*backup\|maqzone.*bkp'; echo "$BACKUP_CMD") | crontab -
log_ok "Backup diario a las 3:00 AM (últimos 7 días en backups/)"

# ── Resumen final ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ┌─────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}  │  MAQZONE desplegado en producción                   │${NC}"
echo -e "${GREEN}  ├─────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}  │  Sitio:   https://${DOMAIN_INPUT}                   │${NC}"
echo -e "${GREEN}  │  Admin:   https://${DOMAIN_INPUT}/admin             │${NC}"
echo -e "${GREEN}  │  Login:   admin@maqzone.mx / Admin123!              │${NC}"
echo -e "${GREEN}  │  (Cambia la contraseña en el primer acceso)         │${NC}"
echo -e "${GREEN}  │                                                     │${NC}"
echo -e "${GREEN}  │  SSL activo en ~1 minuto (Caddy auto-HTTPS)         │${NC}"
echo -e "${GREEN}  └─────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${CYAN}Comandos útiles:${NC}"
echo "  Logs en vivo:  docker compose -f docker-compose.prod.yml logs -f"
echo "  Estado:        docker compose -f docker-compose.prod.yml ps"
echo "  Actualizar:    git pull && bash deploy.sh"
echo "  Apagar:        docker compose -f docker-compose.prod.yml down"
echo "  Watchdog:      systemctl status maqzone-watchdog"
echo "  Backups:       ls -lh ${DEPLOY_DIR}/backups/"
echo ""
