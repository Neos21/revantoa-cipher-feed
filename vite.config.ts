import cloudflareAdapter from '@hono/vite-dev-server/cloudflare';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import serverAdapter from 'hono-react-router-adapter/vite';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [
    mkcert(),  // NOTE : `https://localhost:5173/` ではなく `https://192.168.1.7:5173/` でアクセスした時 (iPhone からの動作確認時など) に Web Crypto API を有効にするため
    tailwindcss(),
    reactRouter(),
    serverAdapter({
      adapter: cloudflareAdapter,
      entry: './server/index.ts'
    })
  ],
  server: {
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]'
      }
    }
  }
});
