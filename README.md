# VOID ATLAS

An immersive, scroll-driven deep-space website. A video-backed 3D tunnel opens
into a moving star field with layered typography and a final contact form.

Built with React, TypeScript, Vinext/Vite, Three.js and GSAP ScrollTrigger.
Typography uses Instrument Serif and Manrope.

## Run locally

Install Node.js **22.13 or newer** and **pnpm 11**. If pnpm is not installed:

```sh
npm install --global pnpm@11.19.0
```

Clone the repository and start the site:

```sh
git clone https://github.com/dsMagnatov/void-atlas.git
cd void-atlas
pnpm install --frozen-lockfile
pnpm dev
```

Open the Local URL printed in the terminal, normally **http://localhost:3000/**.
Keep the terminal running while viewing the site; press Ctrl+C to stop it.
If port 3000 is occupied, use the address printed by the server.
Private repositories require GitHub access before cloning.

No `.env` file, API key, Cloudflare account or database is required for local use.
The tunnel video is included in `public/`; fonts load from Google Fonts and need
an internet connection (system serif/sans-serif fallbacks are provided).
Use a browser with WebGL and hardware acceleration for the full experience.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server with live updates |
| `pnpm build` | Produce the production build in `dist/` |
| `pnpm start` | Preview the production build after building |
| `pnpm test` | Build and run the server-rendered page/asset smoke tests |
| `pnpm lint` | Run ESLint |

Use pnpm and the committed `pnpm-lock.yaml` to keep dependency versions consistent.
The build permissions for the native dependencies are already configured in
`pnpm-workspace.yaml`.

## Where to edit

| File | Contents |
| --- | --- |
| `app/page.tsx` | Page composition and the active tunnel video URL |
| `app/layout.tsx` | Page title, description and document layout |
| `app/globals.css` | Layout, typography, responsive rules and visual effects |
| `app/components/TunnelExperience.tsx` | First screen, video texture, tunnel, stars and scroll animation |
| `app/components/tunnelShaders.ts` | GLSL shaders for the video, tunnel and stars |
| `app/components/CosmicTypographyField.tsx` | Floating phrases, positions, animation timings and contact form |
| `public/tunnel-source.mp4` | Active tunnel video |

The `spatialTexts` array in `CosmicTypographyField.tsx` controls small phrases and
their x/y/z positions and rotations. The GSAP timeline below it controls the
sequence of the two large phrases and the final form.

## Handoff notes

- The contact form is currently a **frontend demo**. Submitting it changes the
  button to `SIGNAL RECEIVED`; it does not send email, call an API or save data.
  Connect a backend or email service before using it to collect real messages.
- Navigation links currently point to the introductory `#experience` section.
- The project retains its original Cloudflare/Sites build configuration in
  `vite.config.ts`, `build/`, `worker/` and `.openai/hosting.json`. The hosting
  project identifier belongs to the original setup. A recipient should configure
  their own deployment target; pushing to GitHub does not deploy the site.
- `public/tunnel-source.png` and `public/vpn-background.mp4` are retained source
  assets from earlier versions. The current page uses `tunnel-source.mp4`.
- Dependencies, local environment files, caches and build output are excluded
  from Git. Recreate dependencies with `pnpm install --frozen-lockfile`.
