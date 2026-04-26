#!/bin/bash
# Script de teste para deploy

set -e

echo "🔧 TESTE DE DEPLOY LOCAL"
echo "========================"

# Verificar sshpass
if ! command -v sshpass &> /dev/null; then
  echo "❌ SSHPass não encontrado. Instalando..."
  brew install sshpass
fi

echo "📡 Testando conexão com servidor..."
echo -n "Password de root@162.240.163.208: "
read -s VPS_PASSWORD
echo ""

if [ -z "$VPS_PASSWORD" ]; then
  echo "❌ Password não pode ser vazia"
  exit 1
fi

# Testar conexão simples
echo "🔄 Testando autenticação SSH..."
if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no -p 22022 root@162.240.163.208 "echo '✅ Autenticação OK!'"; then
  echo "🎉 Conexão SSH funciona perfeitamente!"

  # Testar comandos básicos
  echo ""
  echo "🧪 Testando comandos básicos..."

  # Testar se o diretório existe
  if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no -p 22022 root@162.240.163.208 "[ -d /home/orcaleads/orcleans ] && echo '✅ Diretório do projeto OK' || echo '❌ Diretório não encontrado'"; then
    echo ""
    echo "Pronto para deploy! Execute:"
    echo "./deploy-local.sh"
  else
    echo "❌ Diretório /home/orcaleads/orcleans não encontrado"
  fi
else
  echo "❌ Falha na autenticação SSH"
  echo "Possíveis problemas:"
  echo "1. Password incorreta"
  echo "2. PasswordAuthentication desativado no servidor"
  echo "3. Servidor bloqueando conexão"
  echo ""
  echo "Soluções:"
  echo "1. Verificar password"
  echo "2. No servidor: nano /etc/ssh/sshd_config"
  echo "   - Descomentar: PasswordAuthentication yes"
  echo "   - Executar: service sshd restart"
fi