import { combineReducers, createStore } from "redux";
import { userReducer } from "./user";

const rootReducer = combineReducers({
  user: userReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => unknown;
  }
}

const devtoolsExtension =
  typeof window !== "undefined" &&
  typeof window.__REDUX_DEVTOOLS_EXTENSION__ === "function"
    ? window.__REDUX_DEVTOOLS_EXTENSION__
    : undefined;

export const store = createStore(
  rootReducer,
  devtoolsExtension ? devtoolsExtension() : undefined
);

export type AppDispatch = typeof store.dispatch;
