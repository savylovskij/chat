import { Socket } from 'socket.io';

import { GatewaySessionService } from './gateway-session.service';

const createMockSocket = (id: string): Socket => ({ id }) as unknown as Socket;

describe('GatewaySessionService', () => {
  let service: GatewaySessionService;

  beforeEach(() => {
    service = new GatewaySessionService();
  });

  describe('addSocket', () => {
    it('should add a socket for a user and device', () => {
      const socket = createMockSocket('socket-1');

      service.addSocket('user-1', 'device-1', socket);

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getSocketCount('user-1')).toBe(1);
    });

    it('should support multiple devices for the same user', () => {
      service.addSocket('user-1', 'device-1', createMockSocket('s1'));
      service.addSocket('user-1', 'device-2', createMockSocket('s2'));

      expect(service.getSocketCount('user-1')).toBe(2);
    });
  });

  describe('removeSocket', () => {
    it('should remove a socket and mark user offline when last device disconnects', () => {
      service.addSocket('user-1', 'device-1', createMockSocket('s1'));
      service.removeSocket('user-1', 'device-1');

      expect(service.isUserOnline('user-1')).toBe(false);
    });

    it('should keep user online if other devices remain', () => {
      service.addSocket('user-1', 'device-1', createMockSocket('s1'));
      service.addSocket('user-1', 'device-2', createMockSocket('s2'));
      service.removeSocket('user-1', 'device-1');

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getSocketCount('user-1')).toBe(1);
    });

    it('should handle removing socket for non-existent user', () => {
      expect(() => service.removeSocket('nonexistent', 'device-1')).not.toThrow();
    });
  });

  describe('getUserSockets', () => {
    it('should return the socket map for a user', () => {
      const socket = createMockSocket('s1');
      service.addSocket('user-1', 'device-1', socket);

      const sockets = service.getUserSockets('user-1');

      expect(sockets?.get('device-1')).toBe(socket);
    });

    it('should return undefined for unknown user', () => {
      expect(service.getUserSockets('unknown')).toBeUndefined();
    });
  });

  describe('getOnlineUserIds', () => {
    it('should return all online user IDs', () => {
      service.addSocket('user-1', 'device-1', createMockSocket('s1'));
      service.addSocket('user-2', 'device-1', createMockSocket('s2'));

      const onlineIds = service.getOnlineUserIds();

      expect(onlineIds).toContain('user-1');
      expect(onlineIds).toContain('user-2');
      expect(onlineIds).toHaveLength(2);
    });

    it('should return empty array when no users are online', () => {
      expect(service.getOnlineUserIds()).toEqual([]);
    });
  });
});
