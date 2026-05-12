import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import Icons from 'unplugin-icons/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    nitro(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: { '@': path.resolve(__dirname, './src') },
  },
  ssr: {
    external: ['cheerio'],
  },
})
