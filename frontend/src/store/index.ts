import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./user";
import nameSubmissionsReducer from "./nameSubmissions";

export const store = configureStore({
  reducer: {
    user: userReducer,
    nameSubmissions: nameSubmissionsReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
