export interface User {
  id: string;
  name: string;
  email: string;
}

export type ConnectionStatus = 'open' | 'connecting' | 'close' | 'disconnected';

export interface Instance {
  id: string;
  name: string; // Friendly name
  evoInstanceName: string; // UUID for API
  evoAuthToken: string;
  status: ConnectionStatus;
  phone?: string;
  profilePicUrl?: string;
  createdAt?: number; // Timestamp
}

export interface ApiConfig {
  baseUrl: string;
  globalApiKey: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
}