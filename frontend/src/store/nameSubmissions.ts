import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../lib/axios";

interface NameSubmission {
  id: number;
  attributes: {
    names: string[];
    submitterType: "parent" | "participant";
    isParentPreference: boolean;
    submitter: {
      data: {
        id: number;
      };
    };
    game: {
      data: {
        id: number;
      };
    };
  };
}

interface NameSubmissionsState {
  submissions: NameSubmission[];
  parentNames: string[]; // Nomi del genitore (shuffled per i giocatori)
  hasParentSubmission: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: NameSubmissionsState = {
  submissions: [],
  parentNames: [],
  hasParentSubmission: false,
  isLoading: false,
  error: null,
};

// Async thunk per caricare le submissions di un game e filtrare per utente
export const fetchNameSubmissions = createAsyncThunk(
  "nameSubmissions/fetchByGame",
  async ({ gameId }: { gameId: string }) => {
    const response = await api.get(`/api/name-submissions`, {
      params: { gameId },
    });

    // Il backend ora ritorna solo la submission dell'utente corrente
    const submissions = response.data.data;
    const userSubmission = submissions.length > 0 ? submissions[0] : null;
    const userNames = userSubmission?.attributes?.names || null;

    // Debug info removed for production build

    return {
      allSubmissions: submissions,
      userSubmission,
      userNames,
    };
  }
);

// Async thunk per ottenere i nomi del genitore (shuffled per i giocatori)
export const fetchParentNames = createAsyncThunk(
  "nameSubmissions/fetchParentNames",
  async ({ gameId }: { gameId: string }) => {
    const response = await api.get(
      `/api/name-submissions/parent-names/${gameId}`
    );
    // L'API ritorna { data: { names, shuffled, hasParentSubmission }, meta }
    return response.data.data;
  }
);

// Async thunk per salvare una submission
export const saveNameSubmission = createAsyncThunk(
  "nameSubmissions/save",
  async (
    {
      gameId,
      names,
      submitterType,
    }: {
      gameId: string;
      names: string[];
      submitterType: "parent" | "participant";
    },
    { rejectWithValue }
  ) => {
    try {
      const filteredNames = names.filter((name) => name.trim().length > 0);

      // Save operation in progress

      const response = await api.post("/api/name-submissions", {
        data: {
          gameId: Number(gameId),
          names: filteredNames,
          submitterType,
          // Se è il genitore, questa è la sua preferenza ufficiale
          isParentPreference: submitterType === "parent",
        },
      });

      // Save completed successfully
      return response.data.data;
    } catch (error: unknown) {
      // Extract error message from backend response
      const err = error as {
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        "Impossibile salvare la lista.";
      // Error handled in rejected case
      return rejectWithValue(errorMessage);
    }
  }
);

const nameSubmissionsSlice = createSlice({
  name: "nameSubmissions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch submissions
      .addCase(fetchNameSubmissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNameSubmissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.submissions = action.payload.allSubmissions;
        // Submissions loaded successfully
      })
      .addCase(fetchNameSubmissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Errore nel caricamento";
      })
      // Fetch parent names
      .addCase(fetchParentNames.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchParentNames.fulfilled, (state, action) => {
        state.isLoading = false;
        state.parentNames = action.payload.shuffled || [];
        state.hasParentSubmission = action.payload.hasParentSubmission || false;
        // Parent names loaded successfully
      })
      .addCase(fetchParentNames.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Errore nel caricamento dei nomi";
      })
      // Save submission
      .addCase(saveNameSubmission.pending, (state) => {
        // Save operation starting
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveNameSubmission.fulfilled, (state, action) => {
        // Save operation completed
        state.isLoading = false;

        // Se il payload esiste, aggiorna o aggiungi la submission
        if (action.payload) {
          const existingIndex = state.submissions.findIndex(
            (sub) =>
              sub.attributes?.submitter?.data?.id ===
              action.payload.attributes?.submitter?.data?.id
          );

          if (existingIndex >= 0) {
            state.submissions[existingIndex] = action.payload;
            // Updated existing submission
          } else {
            state.submissions.push(action.payload);
            // Added new submission
          }
        }
      })
      .addCase(saveNameSubmission.rejected, (state, action) => {
        // Save operation failed
        state.isLoading = false;
        state.error = action.error.message || "Errore nel salvataggio";
      });
  },
});

export const { clearError } = nameSubmissionsSlice.actions;

export default nameSubmissionsSlice.reducer;
