import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // checks for presence of Authorization header
  // header format required: Bearer <token>
  // validates the format and the JWT token.
  // extracts user details from token and attaches it to the request object
  // so that the request handler can access the user details.
  if (!req.headers['authorization']) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (typeof authHeader === 'string') {
    token = authHeader.split(' ')[1];
  } 

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        return res.status(401).json({ error: 'Invalid token' });
    }
};