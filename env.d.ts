declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}

interface Window {
  process: {
    env: {
      API_KEY: string;
    }
  }
}