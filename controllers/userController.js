const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

// 공통: 쿠키 옵션 (설정과 삭제 시 동일 옵션 사용해야 안전하게 지워짐)
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',                               // ★ 삭제 시에도 동일해야 함
  maxAge: 30 * 24 * 60 * 60 * 1000,        // 30d
};

const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해주세요.' });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });

    const token = generateToken(user._id);

    // ★ 웹(EJS)용 자동 로그인 유지
    res.cookie('token', token, cookieOpts);

    // ★ API 클라이언트(Thunder Client) 계속 사용 가능하도록 토큰도 JSON으로 반환
    return res.status(201).json({
      _id: user.id,
      username: user.username,
      token,              // ← Thunder Client는 이걸 Bearer로 쓰면 됨
      ok: true,
    });
  } catch (error) {
    return res.status(500).json({ message: '서버에 문제가 발생했습니다.' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }

    const token = generateToken(user._id);

    // ★ 웹(EJS)용 자동 로그인 유지
    res.cookie('token', token, cookieOpts);

    // ★ Thunder Client에서 계속 Bearer로 쓰도록 토큰 반환
    return res.status(200).json({
      _id: user.id,
      username: user.username,
      token,            // ← 여기도 포함
      ok: true,
    });
  } catch (error) {
    return res.status(500).json({ message: '서버에 문제가 발생했습니다.' });
  }
};

const getMe = async (req, res) => {
  // auth 미들웨어가 req.user를 채워줬다고 가정
  if (!req.user) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  const u = req.user;
  return res.status(200).json({
    _id: u._id,
    username: u.username,
    linkedSpotify: !!u.spotifyAccessToken,   // 연동 여부
    createdAt: u.createdAt,
  });
};

const logout = (req, res) => {
  // ★ 설정했던 옵션과 동일하게 지정하여 쿠키를 확실히 제거
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',                    // ← 이게 없으면 안 지워질 수 있음
  });
  return res.status(200).json({ ok: true });
};

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

module.exports = { registerUser, loginUser, getMe, logout };
