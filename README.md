# Face-Off Soccer

Local 2-player arcade soccer for the browser. Mix of air hockey speed, shuffleboard-style kicks, and soccer scoring — with photographic stick-figure faces that react to the match.

## Quick start

Requires **Node.js 20+** (22 recommended).

```bash
nvm use 22
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Controls

| Player | Move | Kick |
|---|---|---|
| Player 1 (Blue) | `W` `A` `S` `D` | `Space` |
| Player 2 (Red) | Arrow keys | `Enter` |

First player to the selected winning score wins.

## Player portraits

Place face photos in `public/players/`:

| File | Expression |
|---|---|
| `player1-happy.jpg` | Happy |
| `player1-amazed.jpg` | Amazed |
| `player1-angry.jpg` | Angry |
| `player1-sad.jpg` | Sad |
| `player2-happy.jpg` | Happy |
| `player2-amazed.jpg` | Amazed |
| `player2-angry.png` | Angry |
| `player2-sad.png` | Sad |

The game already ships with the current portraits. Replace any file with the same name to swap characters. Paths are configured in `src/game/constants.ts` (`FACE_PATHS`).

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run preview` — preview the production build

## Tech

React + TypeScript + Vite + HTML5 Canvas. Physics runs on a fixed timestep; the canvas draw loop is separate from React UI overlays.
