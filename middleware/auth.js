const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid token - user not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Add user info to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Middleware to check if user is admin
const requireAdmin = requireRole(['admin']);

// Middleware to check if user is admin or manager
const requireManagerOrAdmin = requireRole(['admin', 'manager']);

// Middleware to get user's organizations
const getUserOrganizations = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const { data: organizations, error } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          description
        )
      `)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error fetching user organizations:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch user organizations',
        code: 'ORG_FETCH_ERROR'
      });
    }

    req.user.organizations = organizations || [];
    next();
  } catch (error) {
    console.error('Get user organizations error:', error);
    return res.status(500).json({ 
      error: 'Failed to get user organizations',
      code: 'ORG_ERROR'
    });
  }
};

// Middleware to check if user has access to organization
const requireOrganizationAccess = (req, res, next) => {
  const organizationId = req.params.organizationId || req.body.organization_id || req.query.organization_id;
  
  if (!organizationId) {
    return res.status(400).json({ 
      error: 'Organization ID required',
      code: 'ORG_ID_REQUIRED'
    });
  }

  if (!req.user.organizations) {
    return res.status(500).json({ 
      error: 'User organizations not loaded',
      code: 'ORG_NOT_LOADED'
    });
  }

  const hasAccess = req.user.organizations.some(
    org => org.organization_id === organizationId
  );

  if (!hasAccess) {
    return res.status(403).json({ 
      error: 'Access denied to this organization',
      code: 'ORG_ACCESS_DENIED'
    });
  }

  // Add organization info to request
  const userOrg = req.user.organizations.find(
    org => org.organization_id === organizationId
  );
  req.organization = userOrg.organizations;
  req.userOrgRole = userOrg.role;

  next();
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active')
      .eq('id', decoded.userId)
      .single();

    if (!error && user && user.is_active) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip + (req.user ? req.user.id : '');
    const now = Date.now();
    
    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(
        timestamp => now - timestamp < windowMs
      );
      attempts.set(key, userAttempts);
    }
    
    const currentAttempts = attempts.get(key) || [];
    
    if (currentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((currentAttempts[0] + windowMs - now) / 1000)
      });
    }
    
    currentAttempts.push(now);
    attempts.set(key, currentAttempts);
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireManagerOrAdmin,
  getUserOrganizations,
  requireOrganizationAccess,
  optionalAuth,
  sensitiveOperationLimit
};
