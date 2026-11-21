# Face-Off Soccer (Arcade)

Local + online 2-player arcade suite for the browser: soccer, fight, tennis, spear, and tanks. Mix of air hockey speed, shuffleboard-style kicks, and stick-figure face reactions.

**Face-Off Tanks** is an original arcade take inspired by classic top-down tank duels (MIT-friendly mechanics; not a code copy of any specific repo).

## Quick start (local)

Requires **Node.js 20+** (22 recommended).

```bash
nvm use 22
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

## Controls (local couch co-op)

| Player | Move | Action |
|---|---|---|
| Player 1 (Red) | `W` `A` `S` `D` | `Space` (game-specific) |
| Player 2 (Blue) | Arrow keys | `Enter` (game-specific) |

Online: each player uses **Arrow keys + Space** on their own machine (fight also uses hold `↑` jump / `Left Shift` kick).

## Online multiplayer (AWS · ca-central-1)

Stack: **API Gateway WebSocket + Lambda + DynamoDB** (relay), frontend on **Amplify Hosting**. Host runs physics; guest sends inputs and receives state snapshots.

### 1. Deploy the WebSocket API

```bash
cd infra
npm install
npx cdk bootstrap aws://ACCOUNT_ID/ca-central-1
npx cdk deploy
```

Copy the `WebSocketUrl` output (`wss://…/prod`).

### 2. Local online testing

```bash
# repo root
cp .env.example .env
# paste VITE_WS_URL=wss://...
npm run dev
```

Use **Play Online** on any game setup screen → create/join a room code.

### 3. Amplify Hosting

1. Connect this repo in Amplify (build uses `amplify.yml`).
2. Set environment variable **`VITE_WS_URL`** to the CDK `WebSocketUrl`.
3. Redeploy.

**Do not commit AWS access keys.** Use `~/.aws/credentials` or Amplify/CI roles only.

## Player portraits

Place face photos in `public/players/` (`player1-*.jpg` / `player2-*.jpg`). Paths live in `src/game/constants.ts`.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run preview` — preview production build
- `cd infra && npx cdk deploy` — deploy multiplayer backend

## Tech

React + TypeScript + Vite + Canvas · AWS CDK (WebSocket API, Lambda, DynamoDB) · Amplify Hosting
