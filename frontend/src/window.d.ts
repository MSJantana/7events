export {};

declare global {
  interface Window {
    env?: {
      GOOGLE_LOGIN_ENABLED?: string;
      API_URL?: string;
    };
  }
  var env: Window['env'];
}
