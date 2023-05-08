export interface IConversation {
  id: number;
  name: string;
  type: string;
  status?: string;
  ownerId: number;
}
