import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' : l'appli peut être hébergée à la racine ou dans un sous-dossier
// (ex. GitHub Pages : https://<user>.github.io/recettes/).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Les appels à Firebase et à l'API Claude ne doivent jamais être servis depuis le cache.
        navigateFallbackDenylist: [/^\/__\//],
      },
      manifest: {
        name: 'Nos recettes',
        short_name: 'Recettes',
        description: 'Le carnet de recettes à deux : retrouver ce qu’on a aimé et trouver des idées.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6eedb',
        theme_color: '#f6eedb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
