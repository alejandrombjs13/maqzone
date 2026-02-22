#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────
# MAQZONE — Script de despliegue
# Uso: ./deploy.sh
# ─────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}  ███╗   ███╗ █████╗  ██████╗ ███████╗ ██████╗ ███╗   ██╗███████╗${NC}"
echo -e "${CYAN}  ████╗ ████║██╔══██╗██╔═══██╗╚══███╔╝██╔═══██╗████╗  ██║██╔════╝${NC}"
echo -e "${CYAN}  ██╔████╔██║███████║██║   ██║  ███╔╝ ██║   ██║██╔██╗ ██║█████╗  ${NC}"
echo -e "${CYAN}  ██║╚██╔╝██║██╔══██║██║▄▄ ██║ ███╔╝  ██║   ██║██║╚██╗██║██╔══╝  ${NC}"
echo -e "${CYAN}  ██║ ╚═╝ ██║██║  ██║╚██████╔╝███████╗╚██████╔╝██║ ╚████║███████╗${NC}"
echo -e "${CYAN}  ╚═╝     ╚═╝╚═╝  ╚═╝ ╚══▀▀═╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝${NC}"
echo ""
echo -e "${GREEN}  Deploy script — producción${NC}"
echo ""

# ── 1. Verificar que corremos en Linux ───────────────────────
if [[ "$OSTYPE" != "linux"* ]]; then
  echo -e "${RED}Este script es para Linux (tu VPS). En Mac/Windows usa solo para desarrollo.${NC}"
  exit 1
fi

# ── 2. Crear swap si el VPS tiene menos de 2GB RAM ───────────
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')

if [[ "$TOTAL_RAM_MB" -lt 2048 && "$SWAP_MB" -lt 512 ]]; then
  echo -e "${YELLOW}RAM disponible: ${TOTAL_RAM_MB}MB — creando swap de 2GB para el build...${NC}"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile -q
  swapon /swapfile
  # Hacer el swap permanente
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo -e "${GREEN}✓ Swap creado (2GB)${NC}"
else
  echo -e "${GREEN}✓ RAM suficiente (${TOTAL_RAM_MB}MB)${NC}"
fi

# ── 3. Instalar Docker si no está ────────────────────────────
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Docker no encontrado. Instalando...${NC}"
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}✓ Docker instalado${NC}"
else
  echo -e "${GREEN}✓ Docker ya instalado ($(docker --version | cut -d' ' -f3 | tr -d ','))${NC}"
fi

# ── 4. Crear .env si no existe ────────────────────────────────
if [ ! -f .env ]; then
  echo ""
  echo -e "${CYAN}Configurando variables de entorno...${NC}"
  echo ""

  # Dominio
  read -p "  Tu dominio (sin https://, ej: maqzone.mx): " DOMAIN_INPUT
  while [[ -z "$DOMAIN_INPUT" ]]; do
    echo -e "${RED}  El dominio no puede estar vacío.${NC}"
    read -p "  Tu dominio: " DOMAIN_INPUT
  done

  # Generar secrets automáticamente
  ADMIN_TOKEN_GEN=$(openssl rand -hex 32)
  JWT_SECRET_GEN=$(openssl rand -hex 64)

  cat > .env <<EOF
DOMAIN=${DOMAIN_INPUT}
ADMIN_TOKEN=${ADMIN_TOKEN_GEN}
JWT_SECRET=${JWT_SECRET_GEN}
EOF

  echo ""
  echo -e "${GREEN}✓ Archivo .env creado${NC}"
  echo ""
  echo -e "${YELLOW}  ┌─────────────────────────────────────────────┐${NC}"
  echo -e "${YELLOW}  │  GUARDA ESTOS DATOS EN UN LUGAR SEGURO      │${NC}"
  echo -e "${YELLOW}  ├─────────────────────────────────────────────┤${NC}"
  echo -e "${YELLOW}  │  Dominio:     ${DOMAIN_INPUT}${NC}"
  echo -e "${YELLOW}  │  ADMIN_TOKEN: ${ADMIN_TOKEN_GEN}  │${NC}"
  echo -e "${YELLOW}  └─────────────────────────────────────────────┘${NC}"
  echo ""
  read -p "  Presiona Enter para continuar..."
else
  echo -e "${GREEN}✓ Archivo .env encontrado${NC}"
  DOMAIN_INPUT=$(grep DOMAIN .env | cut -d'=' -f2)
fi

# ── 5. Verificar que el .env tiene los campos requeridos ──────
for VAR in DOMAIN ADMIN_TOKEN JWT_SECRET; do
  if ! grep -q "^${VAR}=" .env || [[ -z "$(grep "^${VAR}=" .env | cut -d'=' -f2)" ]]; then
    echo -e "${RED}Error: falta la variable ${VAR} en tu .env${NC}"
    exit 1
  fi
done

# ── 6. Verificar que el dominio apunta a este servidor ────────
echo ""
echo -e "${CYAN}Verificando DNS de ${DOMAIN_INPUT}...${NC}"
SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null || curl -s https://ifconfig.me 2>/dev/null || echo "desconocida")
DOMAIN_IP=$(getent hosts "${DOMAIN_INPUT}" 2>/dev/null | awk '{ print $1 }' | head -1 || echo "")

if [[ "$DOMAIN_IP" == "$SERVER_IP" ]]; then
  echo -e "${GREEN}✓ DNS correcto — ${DOMAIN_INPUT} → ${SERVER_IP}${NC}"
elif [[ -z "$DOMAIN_IP" ]]; then
  echo -e "${YELLOW}⚠ No se pudo resolver ${DOMAIN_INPUT}. Asegúrate de haber creado el registro DNS tipo A apuntando a: ${SERVER_IP}${NC}"
  read -p "  Continuar de todas formas? (s/N): " CONTINUE
  [[ "$CONTINUE" != "s" && "$CONTINUE" != "S" ]] && exit 0
else
  echo -e "${YELLOW}⚠ ${DOMAIN_INPUT} apunta a ${DOMAIN_IP} pero este servidor es ${SERVER_IP}${NC}"
  echo -e "${YELLOW}  El SSL no funcionará hasta que el DNS esté correcto.${NC}"
  read -p "  Continuar de todas formas? (s/N): " CONTINUE
  [[ "$CONTINUE" != "s" && "$CONTINUE" != "S" ]] && exit 0
fi

# ── 7. Levantar los servicios ─────────────────────────────────
echo ""
echo -e "${CYAN}Construyendo y levantando servicios...${NC}"
echo -e "${YELLOW}(Esto puede tardar 3-5 minutos la primera vez)${NC}"
echo ""

docker compose -f docker-compose.prod.yml up -d --build

# ── 8. Verificar que todo esté corriendo ─────────────────────
echo ""
echo -e "${CYAN}Verificando servicios...${NC}"
sleep 5

if docker compose -f docker-compose.prod.yml ps | grep -q "unhealthy\|Exit"; then
  echo -e "${RED}Algunos servicios tienen problemas. Revisa los logs:${NC}"
  echo "  docker compose -f docker-compose.prod.yml logs"
else
  echo ""
  echo -e "${GREEN}  ┌─────────────────────────────────────────────────┐${NC}"
  echo -e "${GREEN}  │  ✓ MAQZONE está corriendo en producción         │${NC}"
  echo -e "${GREEN}  │                                                 │${NC}"
  echo -e "${GREEN}  │  URL:   https://${DOMAIN_INPUT}            │${NC}"
  echo -e "${GREEN}  │  Admin: https://${DOMAIN_INPUT}/admin      │${NC}"
  echo -e "${GREEN}  │                                                 │${NC}"
  echo -e "${GREEN}  │  (El SSL puede tardar ~1 minuto en activarse)   │${NC}"
  echo -e "${GREEN}  └─────────────────────────────────────────────────┘${NC}"
  echo ""
fi

# ── 9. Instalar watchdog como servicio systemd ────────────────
echo -e "${CYAN}Instalando watchdog de resiliencia...${NC}"
DEPLOY_DIR="$(pwd)"
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
echo -e "${GREEN}✓ Watchdog activo (revisa: systemctl status maqzone-watchdog)${NC}"

# ── 10. Backup automático de SQLite (cron diario) ─────────────
echo -e "${CYAN}Configurando backup diario de base de datos...${NC}"
BACKUP_CRON="0 3 * * * docker run --rm -v maqzone_sqlite-data:/data alpine sh -c 'cp /data/maqzone.db /data/maqzone_\$(date +\%Y\%m\%d).db && ls -t /data/maqzone_*.db | tail -n +8 | xargs rm -f 2>/dev/null' >> /var/log/maqzone-backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'maqzone.*backup'; echo "$BACKUP_CRON") | crontab -
echo -e "${GREEN}✓ Backup diario a las 3:00 AM (guarda últimos 7 días)${NC}"

echo ""
echo -e "${CYAN}Comandos útiles:${NC}"
echo "  Ver logs:      docker compose -f docker-compose.prod.yml logs -f"
echo "  Estado:        docker compose -f docker-compose.prod.yml ps"
echo "  Actualizar:    git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo "  Apagar:        docker compose -f docker-compose.prod.yml down"
echo "  Watchdog:      systemctl status maqzone-watchdog"
echo "  Watchdog log:  tail -f watchdog.log"
echo ""
