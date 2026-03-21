export enum WsEvents {
  // Client -> Server
  MESSAGE_SEND = 'message:send',
  MESSAGE_EDIT = 'message:edit',
  MESSAGE_DELETE = 'message:delete',
  MESSAGE_READ = 'message:read',
  REACTION_ADD = 'reaction:add',
  REACTION_REMOVE = 'reaction:remove',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  PRESENCE_PING = 'presence:ping',

  // Server -> Client
  MESSAGE_NEW = 'message:new',
  MESSAGE_EDITED = 'message:edited',
  MESSAGE_DELETED = 'message:deleted',
  MESSAGE_READ_ACK = 'message:read:ack',
  REACTION_ADDED = 'reaction:added',
  REACTION_REMOVED = 'reaction:removed',
  TYPING_UPDATE = 'typing:update',
  USER_ONLINE = 'user:online',
  CHAT_CREATED = 'chat:created',
  CHAT_UPDATED = 'chat:updated',
  MEMBER_ADDED = 'member:added',
  MEMBER_REMOVED = 'member:removed',
  ERROR = 'error',
}
