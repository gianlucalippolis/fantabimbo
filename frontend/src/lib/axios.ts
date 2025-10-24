import axios from "axios";
import { getStrapiConfig } from "./env";
import { store } from "../store";

const { apiUrl: STRAPI_API_URL } = getStrapiConfig();

const api = axios.create({
  baseURL: STRAPI_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config: any) => {
  if (typeof window === "undefined") {
    return config;
  }

  // Get JWT from Redux store (populated by AuthProvider)
  const state: any = store.getState();
  const token = state?.user?.profile?.jwt ?? null;

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

// Client pubblico senza autenticazione per endpoint pubblici
export const publicApi = axios.create({
  baseURL: STRAPI_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
