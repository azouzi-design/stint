// Prototype sandbox: front-end only, no Supabase, not part of the production build.
// Run with `npm run proto`.
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  root: path.resolve(__dirname, 'prototype'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react(), tailwindcss(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 5174 },
  build: { outDir: path.resolve(__dirname, 'dist-prototype'), emptyOutDir: true },
})
