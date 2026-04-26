#!/bin/bash
# Script para atualizar environment variables no backend

echo "🔧 Atualizando variáveis de ambiente do backend"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "server" ]; then
  echo "❌ Diretório 'server' não encontrado"
  echo "Execute este script da raiz do projeto: ./update-backend-env.sh"
  exit 1
fi

cd server

# Criar backup do arquivo atual
if [ -f ".env.production" ]; then
  cp .env.production ".env.production.backup.$(date +%Y%m%d_%H%M%S)"
  echo "✅ Backup criado"
fi

  # Adicionar ou atualizar STRIPE_SECRET_KEY
if grep -q "STRIPE_SECRET_KEY=" .env.production 2>/dev/null; then
  sed -i.bak "s|STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY|" .env.production
  echo "✅ STRIPE_SECRET_KEY atualizada"
else
  echo "STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY" >> .env.production
  echo "✅ STRIPE_SECRET_KEY adicionada"
fi

# Adicionar ou atualizar STRIPE_WEBHOOK_SECRET
if grep -q "STRIPE_WEBHOOK_SECRET=" .env.production 2>/dev/null; then
  sed -i.bak "s|STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET|" .env.production
  echo "✅ STRIPE_WEBHOOK_SECRET atualizada"
else
  echo "STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET" >> .env.production
  echo "✅ STRIPE_WEBHOOK_SECRET adicionada"
fi

# Atualizar CORS_ORIGIN para incluir orcaleads.online
if grep -q "CORS_ORIGIN=" .env.production 2>/dev/null; then
  if ! grep -q "https://orcaleads.online" .env.production; then
    sed -i.bak 's|CORS_ORIGIN="\(.*\)"|CORS_ORIGIN="\1,https://orcaleads.online"|' .env.production
    echo "✅ CORS_ORIGIN atualizada com https://orcaleads.online"
  else
    echo "✅ CORS_ORIGIN já inclui https://orcaleads.online"
  fi
else
  echo 'CORS_ORIGIN="https://orcaleads.online"' >> .env.production
  echo "✅ CORS_ORIGIN adicionada"
fi

# Limpar backups
rm -f .env.production.bak

echo ""
echo "📋 Conteúdo atualizado do .env.production:"
echo "========================================="
grep -E "(STRIPE|CORS)" .env.production
echo ""

echo "🚀 Execute os comandos abaixo no SERVIDOR para aplicar as mudanças:"
echo ""
echo "1. Copie o arquivo .env.production para o servidor (se necessário):"
echo "   scp -P 22022 server/.env.production root@162.240.163.208:/home/orcaleads/orcleans/server/.env.production"
echo ""
echo "2. No servidor, reinicie o backend:"
echo "   cd /home/orcaleads/orcleans/server"
echo "   pm2 restart orca-api"
echo ""
echo "3. Verifique os logs:"
echo "   pm2 logs orca-api --lines 20"
echo ""
echo "💡 Se usar Vercel, adicione estas variáveis no painel do Vercel."
echo "   URL: https://vercel.com/moliveira0602s-projects/orca-api/settings/environment-variables"