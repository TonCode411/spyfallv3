#!/bin/bash
echo "🕵️  Agenten Undercover – Start"
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js nicht gefunden. Bitte installieren: https://nodejs.org"
  exit 1
fi

echo "📦 Installiere Server-Dependencies..."
cd server && npm install --silent

echo "📦 Installiere Client-Dependencies..."
cd ../client && npm install --silent

echo ""
echo "✅ Bereit!"
echo ""
echo "Starte jetzt in zwei Terminals:"
echo ""
echo "  Terminal 1 (Server):  cd server && npm start"
echo "  Terminal 2 (Client):  cd client && npm run dev"
echo ""
echo "Dann im Browser öffnen: http://localhost:3000"
