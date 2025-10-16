import axios from "axios";
import { getStrapiConfig } from "./env";
import { getSession } from "next-auth/react";
import { store } from "../store";

const { apiUrl: STRAPI_API_URL } = getStrapiConfig();

const api = axios.create({
  baseURL: STRAPI_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const state = store.getState();
  const storedJwt = state.user.profile?.jwt ?? null;
  let token = storedJwt;

  if (!token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session: any = await getSession();
    token = session?.jwt ?? null;
  }

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

export default api;
