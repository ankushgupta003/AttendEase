type AuthUser = {
  id: string;
  username: string;
  role: string;
};

type AuthState = {
  token: string;
  user: AuthUser;
};

const AUTH_KEY = "auth";

export function getAuth(): AuthState | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function setAuth(state: AuthState) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export function getAuthToken() {
  return getAuth()?.token ?? "";
}

export function getAuthUser() {
  return getAuth()?.user ?? null;
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}
