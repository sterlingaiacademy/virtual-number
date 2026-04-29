const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { getRedis } = require('../config/redis');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

function signToken(userId, role, clientId) {
  const jti = uuidv4();
  const token = jwt.sign(
    { sub: userId, role, client_id: clientId, jti },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  return { token, jti };
}

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.role, u.client_id, u.is_active,
              c.business_name, c.status as client_status, c.plan
       FROM users u
       LEFT JOIN clients c ON c.id = u.client_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const { token, jti } = signToken(user.id, user.role, user.client_id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.client_id,
        businessName: user.business_name,
        clientStatus: user.client_status,
        plan: user.plan,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { jti, exp } = req.user;
    const expiresAt = new Date(exp * 1000);
    await db.query(
      'INSERT INTO token_blacklist (token_jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [jti, expiresAt]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    const { id, role, client_id, jti, exp } = req.user;
    // Blacklist old token
    const expiresAt = new Date(exp * 1000);
    await db.query(
      'INSERT INTO token_blacklist (token_jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [jti, expiresAt]
    );
    const { token } = signToken(id, role, client_id);
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const result = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    // Always return success to prevent user enumeration
    if (result.rows.length > 0) {
      const redis = getRedis();
      const resetToken = uuidv4();
      await redis.setex(`pwd_reset:${resetToken}`, 3600, result.rows[0].id);
      // TODO: Send reset email via emailService
      console.log(`Password reset token for ${email}: ${resetToken}`);
    }

    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const redis = getRedis();
    const userId = await redis.get(`pwd_reset:${token}`);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
    await redis.del(`pwd_reset:${token}`);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
