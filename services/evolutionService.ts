import { ConnectionStatus } from '../types';

// Configuration
const BASE_URL = 'https://api.liabluck.com';
const GLOBAL_API_KEY = 'TZG3UEHYYR5RYUEYUERU58EUEUYGHD4';

/**
 * Helper to handle fetch requests with auth headers
 */
const evoFetch = async (endpoint: string, options: RequestInit = {}) => {
  const headers = {
    'apikey': GLOBAL_API_KEY,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Evolution API Error [${response.status}]:`, errorText);
      throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Evolution API Network Error [${endpoint}]:`, error);
    throw error;
  }
};

/**
 * Helper to extract Base64 string from various possible API response structures
 */
const extractBase64 = (data: any): string | null => {
  if (!data) return null;
  
  // Check direct properties
  if (typeof data === 'string' && data.length > 50) return data;
  if (data.base64) return data.base64;
  if (data.qrcode) {
     if (typeof data.qrcode === 'string') return data.qrcode;
     if (data.qrcode.base64) return data.qrcode.base64;
  }

  // Check inside 'response' wrapper (common in some Evolution versions)
  if (data.response) {
    if (typeof data.response === 'string' && data.response.length > 50) return data.response;
    if (data.response.base64) return data.response.base64;
    if (data.response.qrcode) {
        if (typeof data.response.qrcode === 'string') return data.response.qrcode;
        if (data.response.qrcode.base64) return data.response.qrcode.base64;
    }
  }

  return null;
};

export const EvolutionService = {
  /**
   * Create a new instance in Evolution API
   */
  createInstance: async (instanceName: string, token: string) => {
    return evoFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        token,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  },

  /**
   * Connect and fetch QR Code (Base64)
   */
  connectInstance: async (instanceName: string) => {
    const response = await evoFetch(`/instance/connect/${instanceName}`);
    
    // Specific check for the "count: 0" issue which implies the instance isn't ready to serve a QR
    // or the endpoint returned a default empty list response.
    if (response && response.count === 0) {
      throw new Error("Instance not ready to generate QR");
    }
    
    const base64Data = extractBase64(response);

    if (base64Data && typeof base64Data === 'string') {
        // Ensure data URI prefix is present
        return base64Data.startsWith('data:image') 
          ? base64Data 
          : `data:image/png;base64,${base64Data}`;
    }
    
    // Log the structure to help debugging if it fails
    console.error("Connect response structure mismatch:", JSON.stringify(response, null, 2));
    throw new Error("No QR code found in response");
  },

  /**
   * Get Pairing Code (alternative to QR)
   */
  getPairingCode: async (instanceName: string, number: string) => {
    // clean number
    const cleanNumber = number.replace(/\D/g, '');
    const response = await evoFetch(`/instance/connect/${instanceName}?number=${cleanNumber}`);
    
    // Evolution API v2 usually returns { pairingCode: "..." }
    // Sometimes it might return { code: "..." } which can be ambiguous (could be QR ref)
    
    let code = response?.pairingCode || response?.pCode;
    
    // Check nested response
    if (!code && response?.response) {
       code = response.response.pairingCode || response.response.pCode;
    }

    // Fallback: Check 'code' property but validate strictly to ensure it's not a QR ref
    if (!code && (response?.code || response?.response?.code)) {
        const potentialCode = response?.code || response?.response?.code;
        // Verify it's not a QR ref (starts with 2@) and is short enough (standard pairing code is ~8 chars)
        if (typeof potentialCode === 'string' && !potentialCode.startsWith('2@') && potentialCode.length < 20) {
            code = potentialCode;
        }
    }
    
    if (typeof code === 'string') {
        // Final safety check
        if (code.startsWith('2@')) {
             throw new Error("API returned QR code string instead of Pairing Code. Please try again.");
        }
        return code;
    }
    
    console.error("Pairing Code Response:", response);
    throw new Error("API did not return a pairing code. Ensure the number is correct.");
  },

  /**
   * Check connection state
   */
  checkConnectionState: async (instanceName: string): Promise<ConnectionStatus> => {
    try {
      const response = await evoFetch(`/instance/connectionState/${instanceName}`);
      // Response format: { instance: { state: 'open' } }
      // Or sometimes { response: { instance: { state: 'open' } } }
      
      const state = response?.instance?.state || response?.response?.instance?.state;
      return state || 'close';
    } catch (e) {
      // If check fails (e.g. 404 instance not found or network error), assume closed
      return 'close';
    }
  },

  /**
   * Disconnect/Logout instance
   */
  logoutInstance: async (instanceName: string) => {
    return evoFetch(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });
  },

  /**
   * Send a simple text message
   */
  sendText: async (instanceName: string, number: string, text: string) => {
    return evoFetch(`/message/send/text/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        options: {
          delay: 1200,
          presence: "composing",
        },
        textMessage: {
          text: text
        }
      }),
    });
  },
};