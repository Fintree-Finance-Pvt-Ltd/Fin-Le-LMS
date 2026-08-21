import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // ====================================================
  // LOAD CURRENT USER
  // ====================================================

  const refreshUser = async () => {
    const data =
      await authService.getMe();

    setUser(data.user);

    return data.user;
  };


  // ====================================================
  // CHECK EXISTING SESSION ON APP LOAD
  // ====================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        await refreshUser();
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);


  // ====================================================
  // LOGIN
  // ====================================================

  const login = async (
    credentials
  ) => {
    /*
      credentials MUST be:

      {
        email: "...",
        password: "..."
      }

      Do NOT JSON.stringify here.
      authService already does that.
    */

    if (
      !credentials ||
      typeof credentials !== "object"
    ) {
      throw new Error(
        "Invalid login credentials"
      );
    }

    const {
      email,
      password,
    } = credentials;

    if (!email || !password) {
      throw new Error(
        "Email and password are required"
      );
    }

    // 1. Authenticate + create session
    await authService.login({
      email: email.trim(),
      password,
    });

    // 2. Fetch complete user including permissions
    const currentUser =
      await refreshUser();

    return currentUser;
  };


  // ====================================================
  // LOGOUT
  // ====================================================

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      // Clear frontend state even if logout API fails
      setUser(null);
    }
  };


  // ====================================================
  // PROVIDER
  // ====================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


// ======================================================
// AUTH HOOK
// ======================================================

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};