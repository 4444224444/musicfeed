const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.query && req.query.token) return req.query.token;
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

// 토큰이 있으면 req.user 채우고, 없어도 통과(페이지/대부분 API용)
const attachUserIfAny = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const u = await User.findById(id).select('-password');
    if (u) {
      u.linkedSpotify = !!u.spotifyAccessToken; // 편의 플래그
      req.user = u;
    }
  } catch (_) { /* ignore */ }
  next();
};

// 보호 라우트용(필요한 API에서만 사용)
const protect = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const u = await User.findById(id).select('-password');
    if (!u) return res.status(401).json({ message: 'Not authorized, user not found' });
    u.linkedSpotify = !!u.spotifyAccessToken;
    req.user = u;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { attachUserIfAny, protect };


