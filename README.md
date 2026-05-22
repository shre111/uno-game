# UNO Online

Multiplayer UNO in the browser — no account required. Play Classic UNO, UNO Flip, or UNO No Mercy with up to 6 friends in real time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.IO |
| Game Logic | Shared TypeScript package (`@uno-game/game-logic`) |
| Monorepo | pnpm + Turborepo |
| Deployment | Vercel (web) + Railway (server) |

## Variants

- **Classic** — standard 108-card UNO
- **UNO Flip** — double-sided deck with light and dark sides; FLIP card swaps all hands
- **UNO No Mercy** — draw-until-playable, stackable draw cards, elimination at 25 cards

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)

### Setup

```bash
# Install all dependencies
pnpm install

# Start both web and server in watch mode
pnpm dev
```

The web app runs at `http://localhost:3000` and the socket server at `http://localhost:4000`.

### Environment Variables

**`apps/server/.env`**

```env
PORT=4000
JWT_SECRET=your-secret-here
CLIENT_ORIGIN=http://localhost:3000
```

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

### Build

```bash
pnpm build
```

Turbo builds `game-logic` first, then `server` and `web` in parallel.

## Deployment

### Server → Railway

1. Create a new Railway project and link this repo.
2. Railway auto-detects `railway.toml` at the root and runs:
   - **Build:** `pnpm install --frozen-lockfile && pnpm turbo run build --filter=server...`
   - **Start:** `node apps/server/dist/index.js`
3. Add environment variables in the Railway dashboard:
   - `JWT_SECRET`
   - `CLIENT_ORIGIN` (your Vercel deployment URL)
   - `PORT` (Railway sets this automatically)

### Web → Vercel

1. Import the repo in Vercel.
2. Vercel auto-detects `vercel.json` at the root.
3. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SERVER_URL` (your Railway deployment URL)

## Project Structure

```
apps/
  web/          # Next.js frontend
  server/       # Express + Socket.IO backend
packages/
  game-logic/   # Shared game engine (deck, rules, state machine)
```
