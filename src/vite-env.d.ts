/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  // Define additional env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

