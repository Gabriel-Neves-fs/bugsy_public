/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUGSY_WEB_URL: string;
  readonly VITE_BUGSY_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
