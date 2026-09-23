import { apiFetch } from "./api";

export const authService = {

  // =====================================================
  // LOGIN
  // =====================================================

 login: (credentials) => {

  return apiFetch(
    "/auth/login",
    {
      method: "POST",

      body: JSON.stringify(
        credentials
      ),

      skipAuthRedirect: true,
    }
  );

},

  // =====================================================
  // GET CURRENT USER
  // =====================================================

  getMe: () => {

    return apiFetch(
      "/auth/me",
      {
        method: "GET",
        skipLoader: true,
      }
    );

  },


  // =====================================================
  // LOGOUT
  // =====================================================

  logout: () => {

    return apiFetch(
      "/auth/logout",
      {
        method: "POST",
        skipLoader: true,
      }
    );

  },


  // =====================================================
  // FORGOT PASSWORD - SEND OTP
  // =====================================================

  forgotPassword: (email) => {

    return apiFetch(
      "/auth/forgot-password",
      {
        method: "POST",

        body: JSON.stringify({
          email,
        }),

        skipAuthRedirect: true,
      }
    );

  },


  // =====================================================
  // VERIFY OTP
  // =====================================================

  verifyOtp: (email, otp) => {

    return apiFetch(
      "/auth/verify-otp",
      {
        method: "POST",

        body: JSON.stringify({
          email,
          otp,
        }),

        skipAuthRedirect: true,
      }
    );

  },


  // =====================================================
  // RESET PASSWORD
  // =====================================================

  resetPassword: ({
    email,
    otp,
    newPassword,
    confirmPassword,
  }) => {

    return apiFetch(
      "/auth/reset-password",
      {
        method: "POST",

        body: JSON.stringify({
          email,
          otp,
          newPassword,
          confirmPassword,
        }),

        skipAuthRedirect: true,
      }
    );

  },

};