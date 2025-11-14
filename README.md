# Eademem — Synth City (AI Music Metropolis)

Interactive demo / showcase built with Vite + React + TypeScript.

This repository is prepared as a showcase site with a focus on interactive visuals and rich graphics. Add your project logo image to `public/logo.png` or update `index.html` to reference your preferred asset.

Quick start

1. Install deps

```bash
npm ci
```

2. Run dev server

```bash
npm run dev
```

3. Build for production

```bash
npm run build
npm run preview
```

Make it interactive & rich graphics
- Use WebGL / three.js for immersive synth-city scenes.
- Add Lottie or animated SVGs for UI micro-interactions.
- Use post-processing (bloom, chromatic aberration) for a retro-futuristic look.
- Offload heavy audio synthesis to WebAudio/AudioWorklet and visualize with canvas or shaders.

Project structure (important files)
- `index.html` — entry HTML. Update meta and add your logo here.
- `src/App.tsx`, `src/index.tsx` (or `App.tsx`, `index.tsx`) — React entry points.
- `vite.config.ts` — Vite config and plugins.

Adding your logo

1. Place your logo at `public/logo.png` (create `public/` if it doesn't exist).
2. Update `index.html` or the header component to reference `/logo.png`.

Repository

Update `package.json` -> `repository.url` and `homepage` with your GitHub repo URL before pushing.

License

This repo is licensed under MIT. See `LICENSE`.
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1DoCbn_3vDNhuu8Xp4IJurc5-zh1V5HZI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
