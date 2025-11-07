const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');


const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',                              
  maxAge: 30 * 24 * 60 * 60 * 1000,      
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

 
    res.cookie('token', token, cookieOpts);

    // 여기 토큰 json 반환
    return res.status(201).json({
      _id: user.id,
      username: user.username,
      token,              // ←썬더클라이언트에서 확인할 토큰
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


    res.cookie('token', token, cookieOpts);

  
    return res.status(200).json({
      _id: user.id,
      username: user.username,
      token,            // 여기도 토큰
      ok: true,
    });
  } catch (error) {
    return res.status(500).json({ message: '서버에 문제가 발생했습니다.' });
  }
};

const getMe = async (req, res) => {
  // 미들웨어..
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
  // 
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',                    //
  });
  return res.status(200).json({ ok: true });
};

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

module.exports = { registerUser, loginUser, getMe, logout };
