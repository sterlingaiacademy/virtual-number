const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify JWT and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check token blacklist
    const blacklisted = await db.query(
      'SELECT 1 FROM token_blacklist WHERE token_jti = $1',
      [decoded.jti]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Load user from DB
    const userResult = await db.query(
      'SELECT id, email, role, client_id, is_active FROM users WHERE id = $1',
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    req.user = { ...user, jti: decoded.jti, exp: decoded.exp };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Require client role
 */
function requireClient(req, res, next) {
  if (!req.user || req.user.role !== 'client') {
    return res.status(403).json({ error: 'Client access required' });
  }
  next();
}

/**
 * Verify internal Python agent secret
 */
function requireAgentSecret(req, res, next) {
  const secret = req.headers['x-agent-secret'];
  if (!secret || secret !== process.env.AGENT_API_SECRET) {
    return res.status(401).json({ error: 'Invalid agent secret' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireClient, requireAgentSecret };
