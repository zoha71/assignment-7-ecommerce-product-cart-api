/**
 * Middleware to protect routes that require authenticated session.
 */
function authGuard(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to access this resource'
    });
  }
  next();
}

/**
 * Middleware to restrict route access strictly to admin users.
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please log in to access this resource'
    });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden: admin privileges required'
    });
  }

  next();
}

module.exports = {
  authGuard,
  requireAdmin
};
