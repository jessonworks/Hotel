
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      // Mapeia tanto SUPABASE_URL quanto URL_SUPABASE (como visto no print da Vercel)
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.URL_SUPABASE || env.VITE_SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)
    },
    server: {
      port: 3000
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
