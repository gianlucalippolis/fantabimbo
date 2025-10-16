export interface NameSubmission {
  id: number;
  names: string[];
  submitterType: "parent" | "participant";
  isParentPreference: boolean;
  submissionOrder?: number;
  submitter: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    userType?: "parent" | "player";
  };
  game: {
    id: number;
    name: string;
    revealAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VictoryResult {
  winners: Array<{
    userId: number;
    user: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    score: number;
    guessedNames: string[];
    exactMatches: string[];
    orderMatches: Array<{
      name: string;
      guessedPosition: number;
      actualPosition: number;
    }>;
  }>;
  parentPreferences: string[];
  gameRevealed: boolean;
  message?: string;
}

export interface NameSubmissionFormData {
  names: string[];
  submitterType: "parent" | "participant";
  isParentPreference?: boolean;
}
