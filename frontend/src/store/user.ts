import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import api from "../lib/axios";
import { mapStrapiGame } from "../lib/games";
import type { GameSummary } from "types/game";

export interface UserProfile {
  id: number | string;
  displayName: string;
  email: string | null | undefined;
  userType: "parent" | "player" | null;
  avatar?: {
    url: string;
    formats?: {
      thumbnail?: { url: string };
      small?: { url: string };
      medium?: { url: string };
    };
  } | null;
  jwt?: string | null;
}

export interface UserState {
  profile: UserProfile | null;
  games: GameSummary[];
  gamesStatus: "idle" | "loading" | "succeeded" | "failed";
  gamesError: string | null;
  lastUpdated: number | null;
}

const initialState: UserState = {
  profile: null,
  games: [],
  gamesStatus: "idle",
  gamesError: null,
  lastUpdated: null,
};

export const fetchGames = createAsyncThunk<
  GameSummary[],
  number | string | null | undefined,
  { rejectValue: string; state: { user: UserState } }
>("user/fetchGames", async (explicitUserId, { rejectWithValue, getState }) => {
  try {
    const response = await api.get("/api/games");
    const rawData = Array.isArray(response.data?.data)
      ? response.data.data
      : [];

    // Use explicit user ID if provided, otherwise fall back to profile
    const currentUserId = explicitUserId ?? getState().user.profile?.id ?? null;

    // Map games directly without the wrapper function
    const mappedGames = rawData
      .map((entity: unknown) => mapStrapiGame(entity, currentUserId))
      .filter((game: GameSummary | null): game is GameSummary => game !== null);

    return mappedGames;
  } catch (error) {
    const err = error as AxiosError<{ error?: { message?: string } }>;
    return rejectWithValue(
      err.response?.data?.error?.message ??
        err.message ??
        "Impossibile caricare le partite."
    );
  }
});

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
      state.gamesStatus = "succeeded";
      state.gamesError = null;
      state.lastUpdated = Date.now();
    },
    clearUser() {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGames.pending, (state) => {
        state.gamesStatus = "loading";
        state.gamesError = null;
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        state.games = action.payload;
        state.gamesStatus = "succeeded";
        state.gamesError = null;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchGames.rejected, (state, action) => {
        state.gamesStatus = "failed";
        state.gamesError = action.payload ?? action.error.message ?? null;
      });
  },
});

export const { setUserProfile, setUserGames, clearUser } = userSlice.actions;

export default userSlice.reducer;
