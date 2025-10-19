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
      namesInTop5: number; // Numero di nomi indovinati nei nomi selezionati
      correctPositions: number; // Numero di posizioni corrette
      perfectGuess: boolean; // true se tutti i nomi sono corretti nelle posizioni giuste
      pointsForNames: number; // Punti per nomi indovinati (20 punti per nome)
      pointsForPositions: number; // Punti per posizioni corrette (30 punti per posizione)
      perfectBonus: number; // Bonus per guess perfetto (100 punti)
    };
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
