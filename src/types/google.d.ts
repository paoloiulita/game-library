interface GoogleOAuth2TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleOAuth2TokenResponse) => void;
  error_callback?: (error: GoogleOAuth2Error) => void;
  prompt?: string;
}

interface GoogleOAuth2TokenClient {
  requestAccessToken(config?: Partial<GoogleOAuth2TokenClientConfig>): void;
}

interface GoogleOAuth2TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GoogleOAuth2Error {
  type: string;
  message?: string;
}

interface GoogleOAuth2Namespace {
  initTokenClient(config: GoogleOAuth2TokenClientConfig): GoogleOAuth2TokenClient;
  revoke(accessToken: string, done?: () => void): void;
}

interface GoogleNamespace {
  accounts: {
    oauth2: GoogleOAuth2Namespace;
  };
}

// Extends Window so we can safely check if GIS has loaded at runtime
interface Window {
  google?: GoogleNamespace;
}

// Available globally once the GIS script has loaded
declare const google: GoogleNamespace;
