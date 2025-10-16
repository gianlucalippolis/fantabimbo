import type { GameSummary } from "types/game";

export interface UserProfile {
  id: number | string;
  displayName: string;
  email: string | null | undefined;
  userType: "parent" | "player" | null;
  jwt?: string | null;
}

export interface UserState {
  profile: UserProfile | null;
  games: GameSummary[];
  lastUpdated: number | null;
}

const INITIAL_STATE: UserState = {
  profile: null,
  games: [],
  lastUpdated: null,
};

type SetProfileAction = {
  type: "user/setProfile";
  payload: UserProfile | null;
};

type SetGamesAction = {
  type: "user/setGames";
  payload: GameSummary[];
};

type ClearUserAction = {
  type: "user/clear";
};

type UserAction = SetProfileAction | SetGamesAction | ClearUserAction;

export function userReducer(
  state: UserState = INITIAL_STATE,
  action: UserAction
): UserState {
  switch (action.type) {
    case "user/setProfile": {
      return {
        ...state,
        profile: action.payload,
        lastUpdated: Date.now(),
      };
    }
    case "user/setGames": {
      return {
        ...state,
        games: Array.isArray(action.payload) ? action.payload : [],
        lastUpdated: Date.now(),
      };
    }
    case "user/clear": {
      return INITIAL_STATE;
    }
    default:
      return state;
  }
}

export const setUserProfile = (profile: UserProfile | null): SetProfileAction => ({
  type: "user/setProfile",
  payload: profile,
});

export const setUserGames = (games: GameSummary[]): SetGamesAction => ({
  type: "user/setGames",
  payload: games,
});

export const clearUser = (): ClearUserAction => ({
  type: "user/clear",
});
