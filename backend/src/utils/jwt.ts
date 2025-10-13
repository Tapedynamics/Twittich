import jwt from 'jsonwebtoken';

// Force environment variables - no defaults for security
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET is not defined in environment variables. Please set it in .env file.');
}

if (!JWT_REFRESH_SECRET) {
  throw new Error('CRITICAL: JWT_REFRESH_SECRET is not defined in environment variables. Please set it in .env file.');
}

// Verify secrets are strong enough (min 32 characters)
if (JWT_SECRET.length < 32) {
  throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters long for security.');
}

if (JWT_REFRESH_SECRET.length < 32) {
  throw new Error('CRITICAL: JWT_REFRESH_SECRET must be at least 32 characters long for security.');
}

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};
