declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
  }
}

interface Window {
  process: {
    env: {
      API_KEY: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    }
  }
}
