// The admin panel's own session — stored apart from the shop's
// (zeescents_token / zeescents_user), so signing in here never signs anyone
// in to the shop, and the shop never sends the admin token.
const TOKEN_KEY = "zeescents_admin_token";
const USER_KEY = "zeescents_admin_user";

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Seconds-since-epoch expiry from the JWT payload, or 0 if unreadable.
const expiryOf = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Number(payload.exp) || 0;
  } catch {
    return 0;
  }
};

export function getAdminToken() {
  const token = read(TOKEN_KEY);
  if (!token) return null;
  if (expiryOf(token) * 1000 <= Date.now()) {
    clearAdminSession();
    return null;
  }
  return token;
}

export function getAdminUser() {
  try {
    return JSON.parse(read(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setAdminSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateAdminUser(changes) {
  const user = getAdminUser();
  if (user) localStorage.setItem(USER_KEY, JSON.stringify({ ...user, ...changes }));
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
}

export const isAdminSignedIn = () => Boolean(getAdminToken() && getAdminUser());
