/**
 * AuthManager — stores the JWT access token in memory only.
 * Uses sessionStorage for minimal persistence across soft refreshes
 * (tab reload), but NOT localStorage (security).
 */
const AuthManager = {
  _accessToken: null,
  _user:        null,

  init() {
    // Restore token from sessionStorage on page load
    const saved = sessionStorage.getItem('sas_user');
    if (saved) {
      try {
        this._user = JSON.parse(saved);
      } catch {
        sessionStorage.removeItem('sas_user');
      }
    }
  },

  setToken(token) {
    this._accessToken = token;
  },

  getToken() {
    return this._accessToken;
  },

  setUser(user) {
    this._user = user;
    sessionStorage.setItem('sas_user', JSON.stringify(user));
  },

  getUser() {
    return this._user;
  },

  isLoggedIn() {
    return !!this._accessToken;
  },

  clear() {
    this._accessToken = null;
    this._user        = null;
    sessionStorage.removeItem('sas_user');
  },
};

export default AuthManager;
