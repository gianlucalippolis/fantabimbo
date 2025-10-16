export interface GameParticipant {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  userType: "parent" | "player" | null;
}

export interface GameSummary {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  inviteCode: string;
  revealAt: string | null;
  isOwner: boolean;
  owner: GameParticipant;
  participants: GameParticipant[];
  createdAt?: string;
}
