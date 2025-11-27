import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // ★ここが抜けていました！

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // 更新ボタンを出す設定
      devOptions: {
        enabled: true // 開発中もPWAを確認できるようにする
      },
      manifest: {
        name: 'Shift App',
        short_name: 'Shift',
        description: 'シフト＆家計管理アプリ',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'vite.svg', // 仮のアイコン（あとで自作画像に変えられます）
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true
  }
})