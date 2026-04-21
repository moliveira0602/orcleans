#!/bin/bash
# =============================================================================
# ORCA - Script de Deploy Completo (Frontend + Backend)
# Uso: ./deploy.sh
# =============================================================================

set -e  # Parar se houver erro

BACKEND_ALIAS="orca-api-etos.vercel.app"
FRONTEND_DIR="$(pwd)"
BACKEND_DIR="$(pwd)/server"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        ORCA — Deploy Completo            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# -----------------------------------------------------------------------------
# 1. BACKEND — Deploy do servidor Express para Vercel
# -----------------------------------------------------------------------------
echo "▶ [1/4] A fazer deploy do BACKEND (orca-api)..."
cd "$BACKEND_DIR"

# Deploy para produção e capturar o URL do novo deployment
DEPLOY_URL=$(npx vercel --prod --yes 2>&1 | grep "Production:" | awk '{print $2}')

if [ -z "$DEPLOY_URL" ]; then
  echo "❌ Erro: deploy do backend falhou ou URL não encontrado."
  exit 1
fi

echo "   ✅ Backend deployed: $DEPLOY_URL"

# -----------------------------------------------------------------------------
# 2. ALIAS — Redirecionar o alias permanente para o novo deployment
# -----------------------------------------------------------------------------
echo ""
echo "▶ [2/4] A atualizar alias permanente..."
npx vercel alias set "$DEPLOY_URL" "$BACKEND_ALIAS" --yes 2>&1 | grep -E "(Success|Error|alias)"
echo "   ✅ Alias atualizado: https://$BACKEND_ALIAS"

# Verificar que o backend responde
echo ""
echo "▶ [3/4] A verificar que o backend está online..."
HEALTH=$(curl -s "https://$BACKEND_ALIAS/api/health" 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✅ Backend healthy: $HEALTH"
else
  echo "   ⚠️  Backend health check falhou: $HEALTH"
  echo "   (Continuar mesmo assim — pode ser cold start)"
fi

# -----------------------------------------------------------------------------
# 3. FRONTEND — Git push (Vercel faz deploy automático via GitHub)
# -----------------------------------------------------------------------------
echo ""
echo "▶ [4/4] A fazer push do FRONTEND para GitHub..."
cd "$FRONTEND_DIR"

# Verificar se há alterações
if git diff --quiet && git diff --staged --quiet; then
  echo "   ℹ️  Sem alterações no frontend para commitar."
else
  echo "   ⚠️  Existem alterações não commitadas no frontend."
  echo "   Por favor faz commit antes de correr este script."
  echo ""
  git status --short
  exit 1
fi

# Push para o GitHub (Vercel faz deploy automático via webhook)
git push origin main
echo "   ✅ Frontend push concluído — Vercel irá fazer deploy automaticamente."

# -----------------------------------------------------------------------------
# RESUMO
# -----------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Deploy completo!                                         ║"
echo "║                                                              ║"
echo "║  Backend:  https://orca-api-etos.vercel.app/api/health      ║"
echo "║  Frontend: https://orca.etos.pt                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
