import axios from "axios";
import { getStrapiConfig } from "./env";
import { getSession } from "next-auth/react";

const { apiUrl: STRAPI_API_URL } = getStrapiConfig();

const api = axios.create({
  baseURL: STRAPI_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session: any = await getSession();
  if (session?.jwt) {
    config.headers.Authorization = `Bearer ${session.jwt}`;
  }
  return config;
});

export default api;
