import NetInfo from '@react-native-community/netinfo';

import { networkMonitorService } from './network-monitor.service';

let netInfoCallback: (state: { isConnected: boolean }) => void;

beforeEach(() => {
  jest.clearAllMocks();
  (NetInfo.addEventListener as jest.Mock).mockImplementation(
    (callback: (state: { isConnected: boolean }) => void) => {
      netInfoCallback = callback;
      return jest.fn();
    },
  );
});

describe('NetworkMonitorService', () => {
  describe('getIsConnected', () => {
    it('should return current connection state', () => {
      expect(typeof networkMonitorService.getIsConnected()).toBe('boolean');
    });
  });

  describe('addListener', () => {
    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = networkMonitorService.addListener(listener);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('start', () => {
    it('should subscribe to NetInfo', () => {
      networkMonitorService.start();

      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should notify listeners when connectivity changes from current state', () => {
      const listener = jest.fn();
      networkMonitorService.addListener(listener);
      networkMonitorService.start();

      const currentState = networkMonitorService.getIsConnected();
      netInfoCallback({ isConnected: !currentState });

      expect(listener).toHaveBeenCalledWith(!currentState);

      listener.mockClear();
      netInfoCallback({ isConnected: !currentState });
      expect(listener).not.toHaveBeenCalled();

      networkMonitorService.addListener(jest.fn());
    });
  });
});
