/// <reference types="vite/client" />

const API_BASE = "https://trust-ai-backend.onrender.com";

export const apiFetch = async (
  endpoint: string,
  method: string = "GET",
  body?: any
) => {
  const url = `${API_BASE}${endpoint}`;

  // 🔥 ALWAYS GET TOKEN FROM LOCALSTORAGE
  const token = localStorage.getItem("token");

  console.log("API CALL:", url);
  console.log("TOKEN:", token);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  const contentType = res.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    console.error("Non-JSON response:", text);
    throw new Error("API route not found");
  }

  // 🔥 HANDLE TOKEN EXPIRE CLEANLY
  if (res.status === 401) {
    console.error("🚨 Token expired or invalid");

    localStorage.removeItem("token");
    window.location.href = "/login"; // redirect

    throw new Error("Session expired. Please login again.");
  }

  if (!res.ok) {
    throw new Error(data.message || "API Error");
  }

  return data;
};