import { Instance, User } from '../types';

/**
 * Since we are building a React SPA without a real Node backend,
 * we will simulate the Database using LocalStorage.
 * This ensures the UX flow works perfectly for the demo.
 */

const STORAGE_KEYS = {
  USER: 'chapchap_user',
  INSTANCES: 'chapchap_instances',
};

export const MockDB = {
  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  login: (email: string): User => {
    const user = { id: 'usr_123', name: 'Demo User', email };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getInstances: (): Instance[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INSTANCES);
    return data ? JSON.parse(data) : [];
  },

  addInstance: (instance: Instance) => {
    const instances = MockDB.getInstances();
    // Prevent duplicates
    if (!instances.find(i => i.evoInstanceName === instance.evoInstanceName)) {
      // Ensure createdAt exists
      const newInstance = { 
        ...instance, 
        createdAt: instance.createdAt || Date.now() 
      };
      instances.push(newInstance);
      localStorage.setItem(STORAGE_KEYS.INSTANCES, JSON.stringify(instances));
    }
  },

  updateInstanceStatus: (id: string, status: Instance['status'], phone?: string) => {
    const instances = MockDB.getInstances();
    const index = instances.findIndex(i => i.id === id);
    if (index !== -1) {
      instances[index].status = status;
      if (phone) instances[index].phone = phone;
      localStorage.setItem(STORAGE_KEYS.INSTANCES, JSON.stringify(instances));
    }
  },

  removeInstance: (id: string) => {
    const instances = MockDB.getInstances().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INSTANCES, JSON.stringify(instances));
  }
};