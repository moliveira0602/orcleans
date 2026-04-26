#!/bin/bash
# Script de deploy LOCAL para o VPS
# Uso: ./deploy-local.sh

set -e

VPS_HOST="162.240.163.208"
VPS_PORT="22022"
VPS_USER="root"
VPS_PATH="/home/orcaleads/orcleans"
WEB_PATH="/home/orcaleads/public_html"

echo "🚀 Deploy Local para VPS"
echo "========================"

# Pedir password
echo -n "Password de root@$VPS_HOST: "
read -s VPS_PASSWORD
echo ""

if [ -z "$VPS_PASSWORD" ]; then
  echo "❌ Password não pode ser vazia"
  exit 1
fi

# Testar conexão primeiro
echo "🔍 Testando conexão SSH..."
if ! sshpass -p "$VPS_PASSWORD" ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -p $VPS_PORT $VPS_USER@$VPS_HOST "echo '✅ Conexão OK'"; then
  echo "❌ Falha na conexão SSH"
  echo "Verifique a password ou configuração do servidor"
  exit 1
fi
echo "✅ Conexão verificada"

# Verificar se sshpass está instalado
if ! command -v sshpass &> /dev/null; then
  echo "⚠️  sshpass não encontrado. Instalando..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install sshpass
  else
    sudo apt-get update && sudo apt-get install -y sshpass
  fi
fi

# Função para executar comandos remotos
remote_exec() {
  echo "Executando remoto: $1"
  sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no -p $VPS_PORT $VPS_USER@$VPS_HOST "$1"
}

# 1. Build local
echo "🏗️  Building frontend..."
npm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist/ 2>/dev/null)" ]; then
  echo "❌ ERRO: Pasta dist/ vazia"
  exit 1
fi

echo "✅ Build OK"

# 2. Deploy para VPS
echo "📤 Enviando ficheiros..."

# Limpar e copiar
remote_exec "rm -rf $WEB_PATH/* && rm -rf $WEB_PATH/assets && rm -rf $WEB_PATH/images"
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no -P $VPS_PORT -r dist/* $VPS_USER@$VPS_HOST:$WEB_PATH/

# Ajustar permissões
remote_exec "chown -R orcaleads:orcaleads $WEB_PATH && find $WEB_PATH -type f -exec chmod 644 {} \; && find $WEB_PATH -type d -exec chmod 755 {} \;"

echo "✅ Frontend deployado"

# 3. Build backend
echo "🔧 Building backend..."
remote_exec "cd $VPS_PATH/server && npm install && npm run build && npx prisma generate"

# 3.5 Copy .env.production to server
echo "📄 Copiando .env.production..."
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no -P $VPS_PORT server/.env.production $VPS_USER@$VPS_HOST:$VPS_PATH/server/.env.production

# 4. Restart API
echo "🔄 Reiniciando API..."
remote_exec "cd $VPS_PATH/server && pm2 restart orca-api 2>/dev/null || pm2 start dist/index.js --name orca-api"

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo "===================="
echo "📁 Site: https://orcaleads.online"
