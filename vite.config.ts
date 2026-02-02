
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de arquivos .env (local)
  const envFile = loadEnv(mode, process.cwd(), '');
  
  // Mescla com as variáveis do sistema (Vercel/Node)
  // Isso é crucial para que a Vercel encontre URL_SUPABASE, etc.
  const env = { ...process.env, ...envFile };
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
      'process.env.SUPABASE_URL': JSON.stringify(env.URL_SUPABASE || env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.ANON_KEY || env.SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY || '')
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
