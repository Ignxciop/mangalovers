#!/bin/sh
set -e

echo "[entrypoint] Esperando a que PostgreSQL esté disponible..."

i=1
while [ $i -le 30 ]; do
  if node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$queryRawUnsafe('SELECT 1')
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "[entrypoint] PostgreSQL disponible."
    break
  fi
  echo "[entrypoint] PostgreSQL no disponible - intento $i/30, reintentando en 3s..."
  sleep 3
  i=$((i + 1))
done

if [ "$i" -gt 30 ]; then
  echo "[entrypoint] ERROR: PostgreSQL no disponible después de 30 intentos"
  exit 1
fi

echo "[entrypoint] Ejecutando migraciones..."
pnpm prisma migrate deploy

echo "[entrypoint] Iniciando backend..."
exec node index.js
