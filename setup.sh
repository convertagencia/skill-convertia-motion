#!/usr/bin/env bash
# Instala as dependências do convertia-motion dentro da própria pasta da skill.
# Rodar uma vez depois de copiar/clonar a skill: bash setup.sh
# Só precisa de Node.js 18+ (o ffmpeg vem pelo pacote ffmpeg-static).
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "Node.js não encontrado. Instale o Node 18+ e rode de novo."; exit 1; }

echo "== npm (playwright + ffmpeg-static)"
npm install --no-audit --no-fund --silent
npx playwright install chromium

echo "== teste"
node scripts/doctor.mjs
