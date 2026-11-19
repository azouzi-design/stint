// Prototype sandbox: not part of the production build. Uses the project's Supabase (dev) for sign-in + sync.
// Run with `npm run proto`.
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  root: path.resolve(__dirname, 'prototype'),
  publicDir: path.resolve(__dirname, 'public'),
  envDir: __dirname, // the repo root's .env.local (Supabase URL + public key)
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 5174 },
  build: {
    outDir: path.resolve(__dirname, 'dist-prototype'),
    emptyOutDir: true,
    // The app, plus the static Guide, Privacy Policy and Terms pages (/guide, /privacy, /terms).
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'prototype/index.html'),
        guide: path.resolve(__dirname, 'prototype/guide/index.html'),
        privacy: path.resolve(__dirname, 'prototype/privacy/index.html'),
        terms: path.resolve(__dirname, 'prototype/terms/index.html'),
      },
    },
  },
})
