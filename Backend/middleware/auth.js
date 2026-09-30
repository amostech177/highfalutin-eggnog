import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export function requireAuth(req, res, next) {
  // Support both Authorization header and httpOnly cookie
  const header = req.headers.authorization || '';
  const [kind, tokenFromHeader] = header.split(' ');
  const tokenFromCookie = req.cookies?.token;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    logger.debug({ 
      hasAuthHeader: !!header, 
      hasCookie: !!tokenFromCookie, 
      cookies: req.cookies 
    }, 'Auth failed: missing token');
    return res.status(401).json({ success: false, message: 'Missing auth token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    logger.debug({ error: err.message }, 'Auth failed: invalid token');
    return res.status(401).json({ success: false, message: 'Invalid auth token' });
  }
}

export function generateToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

