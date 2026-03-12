# Top-Down Space Game (Phaser + TypeScript)

Minimal first version of your game idea:
- 1 player ship (free movement like Geometry Wars)
- 1 asteroid type
- 1 bullet type
- 1 obstacle type
- score + hull + game over
- enemy ships that fire
- wave progression
- Xbox/GameSir controller support + keyboard/mouse fallback

## Controls
- Move: left stick (controller) or WASD
- Aim: right stick (controller) or mouse
- Fire: RT / A / RB (controller), or left mouse / SPACE
- Restart after game over: R

## Run in VS Code
1. Install Node.js LTS (if not installed): https://nodejs.org/
2. Open this folder in VS Code.
3. Install deps:
   ```powershell
   npm install
   ```
4. Start dev server:
   ```powershell
   npm run dev
   ```
5. Open `http://localhost:5173`.

## Suggested VS Code Extensions
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `ms-vscode.vscode-typescript-next`

## Next Steps
- add player invulnerability frames after hit
- add enemy variants
- add audio + particles
- add start menu and pause