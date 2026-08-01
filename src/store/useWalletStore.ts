import { create } from 'zustand';

export interface DbWallet {
  _id: string;
  ownerId: string;
  address: string;
  name: string;
  chainId: number;
  walletType: 'EOA' | 'Safe' | 'ERC4337';
  status: 'active' | 'frozen';
  createdAt: string;
}

interface WalletState {
  // Web3 state
  metaMaskAddress: string | null;
  metaMaskConnected: boolean;
  metaMaskChainId: number | null;
  metaMaskBalance: string;
  isConnecting: boolean;
  
  // Database wallets state
  wallets: DbWallet[];
  loading: boolean;
  error: string | null;

  // Web3 operations
  connectMetaMask: () => Promise<void>;
  disconnectMetaMask: () => void;
  updateMetaMaskBalance: () => Promise<void>;

  // Database operations
  fetchDbWallets: () => Promise<void>;
  createDbWallet: (name: string, address: string, chainId: number, walletType: string) => Promise<boolean>;
  freezeDbWallet: (id: string) => Promise<boolean>;
  unfreezeDbWallet: (id: string) => Promise<boolean>;
  deleteDbWallet: (id: string) => Promise<boolean>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  metaMaskAddress: null,
  metaMaskConnected: false,
  metaMaskChainId: null,
  metaMaskBalance: '0.00',
  isConnecting: false,
  
  wallets: [],
  loading: false,
  error: null,

  connectMetaMask: async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      set({ error: 'MetaMask is not installed. Please install MetaMask browser extension.' });
      return;
    }

    set({ isConnecting: true, error: null });
    try {
      // Request MetaMask accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts authorized');
      }

      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      const chainId = parseInt(chainIdHex, 16);
      
      set({
        metaMaskAddress: accounts[0],
        metaMaskConnected: true,
        metaMaskChainId: chainId,
        isConnecting: false,
      });

      await get().updateMetaMaskBalance();
    } catch (e: any) {
      console.error(e);
      set({ isConnecting: false, error: e.message || 'Failed to connect MetaMask' });
    }
  },

  disconnectMetaMask: () => {
    set({
      metaMaskAddress: null,
      metaMaskConnected: false,
      metaMaskChainId: null,
      metaMaskBalance: '0.00',
    });
  },

  updateMetaMaskBalance: async () => {
    const { metaMaskAddress } = get();
    if (!metaMaskAddress || typeof window === 'undefined' || !window.ethereum) return;

    try {
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [metaMaskAddress, 'latest'],
      }) as string;
      const balanceWei = BigInt(balanceHex);
      // Format to 4 decimals
      const ethVal = Number(balanceWei) / 1e18;
      set({ metaMaskBalance: ethVal.toFixed(4) });
    } catch (e) {
      console.error('Balance check failed:', e);
    }
  },

  fetchDbWallets: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/wallets');
      const data = await res.json();
      if (data.success) {
        set({ wallets: data.data, loading: false });
      } else {
        set({ error: data.error?.message || 'Failed to fetch wallets', loading: false });
      }
    } catch (e) {
      set({ error: 'Failed to connect to API', loading: false });
    }
  },

  createDbWallet: async (name, address, chainId, walletType) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, chainId, walletType }),
      });
      const data = await res.json();
      if (data.success) {
        await get().fetchDbWallets();
        return true;
      } else {
        set({ error: data.error?.message || 'Failed to create wallet', loading: false });
        return false;
      }
    } catch (e) {
      set({ error: 'API connection failed', loading: false });
      return false;
    }
  },

  freezeDbWallet: async (id) => {
    try {
      const res = await fetch(`/api/wallets/${id}/freeze`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        set((state) => ({
          wallets: state.wallets.map((w) => (w._id === id ? { ...w, status: 'frozen' } : w)),
        }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  unfreezeDbWallet: async (id) => {
    try {
      const res = await fetch(`/api/wallets/${id}/unfreeze`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        set((state) => ({
          wallets: state.wallets.map((w) => (w._id === id ? { ...w, status: 'active' } : w)),
        }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  deleteDbWallet: async (id) => {
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        set((state) => ({
          wallets: state.wallets.filter((w) => w._id !== id),
        }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },
}));

// Setup window.ethereum types
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
