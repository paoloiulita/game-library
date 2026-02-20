import { SCOPES } from '../config/sheets';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let gisScriptLoaded = false;

const ensureGisLoaded = (): Promise<void> => {
  if (gisScriptLoaded) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    // Script may have been injected already (e.g. by index.html)
    if ((window as Window).google?.accounts?.oauth2) {
      gisScriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      gisScriptLoaded = true;
      resolve();
    });
    script.addEventListener('error', () => {
      reject(new Error('Failed to load Google Identity Services. Check your network connection.'));
    });
    document.head.appendChild(script);
  });
};

interface TokenResult {
  token: string;
  expiry: number;
}

export const requestAccessToken = async (clientId: string): Promise<TokenResult> => {
  await ensureGisLoaded();

  return new Promise<TokenResult>((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error !== undefined) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }
        resolve({
          token: response.access_token,
          expiry: Date.now() + response.expires_in * 1000,
        });
      },
      error_callback: (error) => {
        if (error.type === 'popup_closed') {
          reject(new Error('Sign-in popup was closed. Please try again.'));
        } else {
          reject(new Error(error.message ?? error.type));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
};

export const revokeAccessToken = (accessToken: string): void => {
  google.accounts.oauth2.revoke(accessToken);
};
