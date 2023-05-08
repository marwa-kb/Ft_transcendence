export namespace srv {
  export interface Update {
    toUpdate: number;
    channelId?: number;
  }

  export interface Dm {
    id: number;
    type: string;
    users: {
      user: {
        id: number;
        username: string;
        status: string;
      };
    }[];
  }

  export interface ChannelUser {
    role: string;
    user: {
      status: string;
      username: string;
      usersBlocked: number[];
    };
    userId: number;
  }

  export interface ChatUser {
    id: number;
    status: string;
    username: string;
    usersBlocked: number[];
  }

  export interface Invite {
    inviterId: number;
    inviterName: string;
  }
}
