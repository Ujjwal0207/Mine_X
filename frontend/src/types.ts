export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  bio: string;
  createdAt: string;
}

export interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    name: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  actor: {
    id: string;
    username: string;
    name: string;
  };
  type: string;
  entityId?: string;
  content: string;
  read: boolean;
  createdAt: string;
}
