
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Estas linhas garantem que o Vite encontre as chaves na Vercel, mesmo com ou sem o prefixo VITE_
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || process.env.VITE_API_KEY),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
