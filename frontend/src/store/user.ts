import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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

const initialState: UserState = {
  profile: null,
  games: [],
  lastUpdated: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserProfile(state, action: PayloadAction<UserProfile | null>) {
      state.profile = action.payload;
      state.lastUpdated = Date.now();
    },
    setUserGames(state, action: PayloadAction<GameSummary[]>) {
      state.games = Array.isArray(action.payload) ? action.payload : [];
      state.lastUpdated = Date.now();
    },
    clearUser() {
      return { ...initialState };
    },
  },
});

export const { setUserProfile, setUserGames, clearUser } = userSlice.actions;
export const userReducer = userSlice.reducer;
