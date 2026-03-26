import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkListener = (isConnected: boolean) => void;

class NetworkMonitorService {
  private isConnected = true;
  private listeners: NetworkListener[] = [];

  start(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;

      if (connected !== this.isConnected) {
        this.isConnected = connected;

        for (const listener of this.listeners) {
          listener(connected);
        }
      }
    });
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  addListener(listener: NetworkListener): () => void {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter((registered) => registered !== listener);
    };
  }
}

export const networkMonitorService = new NetworkMonitorService();
