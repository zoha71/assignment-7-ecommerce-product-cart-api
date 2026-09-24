const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readData, modifyData } = require('../utils/fileHelper');

// Standard email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new customer user.
 */
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "username" is required and must be a non-empty string'
      });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: A valid "email" address is required'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: "password" must be at least 6 characters long'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    let createdUser = null;

    await modifyData('users.json', async (users) => {
      const existingUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existingUser) {
        const err = new Error('Email is already registered');
        err.statusCode = 400;
        throw err;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        id: `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
        username: cleanUsername,
        email: normalizedEmail,
        passwordHash,
        role: 'customer',
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      createdUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      };

      return users;
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: createdUser
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
}

/**
 * Authenticate customer or admin and establish session.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const users = await readData('users.json');

    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Store minimal safe user in session
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    req.session.user = sessionUser;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: sessionUser
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Terminate session and clear cookie.
 */
function logout(req, res, next) {
  if (!req.session) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
}

/**
 * Get current session profile.
 */
function getProfile(req, res) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to access this resource'
    });
  }
  return res.status(200).json({
    success: true,
    user: req.session.user
  });
}

module.exports = {
  register,
  login,
  logout,
  getProfile
};
