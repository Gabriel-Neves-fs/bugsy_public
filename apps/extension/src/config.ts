const webBaseUrl = normalizeBaseUrl(import.meta.env.VITE_BUGSY_WEB_URL, "VITE_BUGSY_WEB_URL");
const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_BUGSY_API_URL, "VITE_BUGSY_API_URL");

export const DASHBOARD_URL = webBaseUrl;
export const WEB_NEW_RECORDING_URL = `${webBaseUrl}/recordings/new`;
export const API_UPLOAD_URL = `${apiBaseUrl}/recordings/upload`;

function normalizeBaseUrl(value: string | undefined, variableName: string) {
  if (!value) {
    throw new Error(`Missing extension environment variable: ${variableName}.`);
  }

  const url = new URL(value);

  return url.origin;
}
