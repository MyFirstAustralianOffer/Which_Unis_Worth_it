/**
 * Input validation rules, kept in one place so forms stay consistent.
 */

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());

export const MIN_PASSWORD_LENGTH = 8;
export const isPassword = (value) => String(value).length >= MIN_PASSWORD_LENGTH;
