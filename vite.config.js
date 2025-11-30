import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      devOptions: { enabled: true },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'MyPortalOne',       // ★ここを変更！
        short_name: 'MyPortal',    // ★ここを変更！
        description: '自分だけのポータルサイト',
        theme_color: '#1976d2',    // テーマカラーも青に
        background_color: '#f5f5f5',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-icon.svg',   // ★さっき作ったファイル
            sizes: '192x192',
            type: 'image/svg+xml', // SVG形式を指定
            purpose: 'any maskable'
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { host: true }
})