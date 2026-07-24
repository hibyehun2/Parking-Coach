import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Parking Coach',
        short_name: 'Parking Coach',
        description: '안전한 수정 방법을 익히고, 단계별 안내에 따라 후진 주차를 연습해요.',
        start_url: '/Parking-Coach/',
        scope: '/Parking-Coach/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#f5f8f6',
        theme_color: '#17231f',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}', 'assets/**/*.png', 'icons/*.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  base: '/Parking-Coach/',
})
