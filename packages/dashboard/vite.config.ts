import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@meta-governor/shared': path.resolve(__dirname, '../shared/types.ts'),
      '@': path.resolve(__dirname, './src')
    }
  }
})