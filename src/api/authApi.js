import apiClient from "./apiClient";

export const signUpRequest = async (userData) => {
    const response = await apiClient.post('/auth/signup', userData)

    return response.data
}

export const loginRequest = async (userData) => {
    const response = await apiClient.post('/auth/login', userData)
    return response.data;
}

export const forgotPasswordRequest = async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email })
    return response.data;
}

export const resetPasswordRequest = async (token, password) => {
    const response = await apiClient.post('/auth/reset-password', { token, password })
    return response.data;
}

export const requestSignupVerification = async (userData) => {
    const response = await apiClient.post('/auth/signup/request-verification', userData)
    return response.data;
}

export const verifySignupVerification = async ({ email, code }) => {
    const response = await apiClient.post('/auth/signup/verify', { email, code })
    return response.data;
}

export const exchangeGoogleLoginCode = async (code) => {
    const response = await apiClient.post('/auth/google/exchange', { code });
    return response.data;
}
