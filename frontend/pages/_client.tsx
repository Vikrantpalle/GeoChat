import axios, { CreateAxiosDefaults } from "axios";

export function fetchClient() {
  const defaultOptions: CreateAxiosDefaults = {
    baseURL: "http://localhost:5000/",
  };

  let instance = axios.create(defaultOptions);

  instance.interceptors.request.use((config) => {
    let sessionKey = localStorage.getItem("session-key");
    config.headers.Authorization = sessionKey ? sessionKey : "";
    return config;
  });

  return instance;
}
