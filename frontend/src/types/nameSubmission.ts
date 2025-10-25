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
    details: {
      babyNameGuessed: boolean;
      babyNameInFirstPosition: boolean;
      correctPositions: number;
      nearPositions: number;
      pointsForBabyName: number;
      pointsForCorrectPositions: number;
      pointsForNearPositions: number;
      podiumPenalty: number;
    };
    nameBreakdown?: Array<{
      name: string;
      position: number;
      correctPosition: number | null;
      distance: number | null;
      points: number;
      reason: string;
      type: 'babyNameFirst' | 'babyNameGuessed' | 'correctPosition' | 'nearPosition' | 'farPosition' | 'wrongName';
    }>;
  }>;
  parentPreferences: string[]; // Nomi selezionati dal genitore
  babyName: string | null;
  gameRevealed: boolean;
  message?: string;
}

export interface NameSubmissionFormData {
  names: string[];
  submitterType: "parent" | "participant";
  isParentPreference?: boolean;
}
