# 🕵️ Agenten Undercover

Ein digitales Deduktionsspiel für 3–8 Spieler im Browser. Jeder spielt auf seinem eigenen Gerät, per Lobby-Code.

## Spielprinzip

Alle Spieler befinden sich am selben geheimen Ort – **nur der Agent weiß den Ort nicht**.
Durch gezielte Fragen versuchen die Spieler, den Agenten zu enttarnen – ohne dabei zu viele Hinweise zu geben.
Der Agent versucht, den Ort zu erraten, bevor er auffliegt.

---

## Setup & Starten

### Voraussetzungen
- [Node.js](https://nodejs.org/) (Version 18 oder höher)

### 1. Server starten

```bash
cd server
npm install
npm start
```

Der Server läuft auf **Port 3001**.

### 2. Client starten (in einem zweiten Terminal)

```bash
cd client
npm install
npm run dev
```

Der Client läuft auf **http://localhost:3000**

---

## Spielablauf

1. **Host** erstellt eine Lobby → erhält einen 6-stelligen Code
2. **Alle anderen** gehen auf dieselbe URL und geben den Code ein (oder nutzen den Einladungslink)
3. Host kann unter **"Orte verwalten"** festlegen, welche Orte im Spiel sind
4. Host drückt **"Runde starten"** → jeder sieht nur seine eigene Karte
5. Karte erst aufdecken wenn man dran ist – niemand darf den Bildschirm des anderen sehen!
6. Nach der Diskussion drückt der Host **"Runde auflösen"** → alle Karten werden enthüllt
7. **"Nächste Runde"** → sofort weiterspielen mit zufällig neuem Ort

---

## Karten-Typen

| Karte | Inhalt |
|-------|--------|
| 🟢 Normale Spieler | Ort + Rolle (z.B. "🦁 Zoo · Löwenpfleger") |
| 🔴 Agent | Nur "Du bist der AGENT" – kein Ort, keine Rolle |

---

## Features

- ✅ Realtime Multiplayer via Socket.io
- ✅ Lobby-System mit Einladungslink
- ✅ 40 Orte mit je 10 Rollen (400 Rollenkarten!)
- ✅ Orte-Liste für alle sichtbar (zum taktischen Streichen)
- ✅ Agent kann Orte interaktiv ausschließen
- ✅ Normale Spieler können ebenfalls Orte markieren/abhaken
- ✅ Timer mit Start/Pause/Reset
- ✅ Host kann Orts-Sets konfigurieren
- ✅ Automatische Rollen-Anpassung je nach Spieleranzahl
- ✅ Auflösungs-Screen mit allen Karten

---

## Deployment (optional, für echtes Online-Spiel)

### Einfach: Railway.app
1. Repo auf GitHub pushen
2. Auf [railway.app](https://railway.app) neues Projekt aus GitHub erstellen
3. Server-Ordner deployen
4. `VITE_SERVER_URL` im Client auf die Railway-URL setzen
5. Client-Ordner deployen (z.B. auf Vercel oder Netlify)

---

## Projektstruktur

```
spyfall/
├── server/
│   ├── index.js          ← Express + Socket.io Server
│   ├── gameData.js       ← Alle 40 Orte und Rollen
│   └── package.json
└── client/
    ├── src/
    │   ├── App.jsx           ← Haupt-App, Socket-Logik
    │   ├── StartScreen.jsx   ← Lobby erstellen/beitreten
    │   ├── LobbyScreen.jsx   ← Wartezimmer + Einstellungen
    │   ├── SpielScreen.jsx   ← Karte + Ortsliste
    │   ├── AuflösungScreen.jsx ← Ergebnis-Anzeige
    │   ├── socket.js         ← Socket.io Client
    │   └── index.css         ← Globale Styles
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Eigene Sets hinzufügen (später)

In `server/gameData.js` einfach neue Objekte ins `ORTE`-Array einfügen:

```js
{
  id: 41,
  name: "Mein neuer Ort",
  emoji: "🎯",
  rollen: ["Rolle 1", "Rolle 2", ..., "Rolle 10"]
}
```

---

*Inspiriert von „Spyfall" (Alexandr Ushan / Piatnik) – eigenständige Neuimplementierung für den privaten Gebrauch.*
