export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Login required' });
  }
  next();
}

export function optionalUser(req, _res, next) {
  req.userId = req.session?.userId || null;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.session?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}
