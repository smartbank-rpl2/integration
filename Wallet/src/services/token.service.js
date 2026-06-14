import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export const tokenService = {
  generateTokens: (userPayload) => {
    // Payload contains: userId, name, email, phone, walletId
    const accessToken = jwt.sign(
      { ...userPayload, sub: userPayload.userId },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpires, issuer: config.jwt.issuer, audience: config.jwt.audience }
    );

    const refreshToken = jwt.sign(
      { userId: userPayload.userId },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpires, issuer: config.jwt.issuer, audience: config.jwt.audience }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpires
    };
  }
};
