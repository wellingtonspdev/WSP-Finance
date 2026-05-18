import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/authEnv';

interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

export function AuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ message: 'Token not provided' });
  }

  const [, token] = authorization.split(' ');

  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret);
    const { sub } = decoded as TokenPayload;

    req.user = {
      id: Number(sub), // MUDANÇA: Converter string para number
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
}