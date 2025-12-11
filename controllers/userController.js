const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

// 🔹 정규식 규칙
const ID_REGEX   = /^[a-zA-Z0-9]+$/;       // 아이디: 영문+숫자
const PW_REGEX   = /^[a-zA-Z0-9]+$/;       // 비번: 영문+숫자
const NICK_REGEX = /^[가-힣a-zA-Z0-9]+$/;  // 닉네임: 한글+영문+숫자

// 쿠키 옵션
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
};

// 토큰 생성 함수
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

/* ------------------------------------------------------------------ */
/*  회원가입                                                           */
/*  POST /api/users/register                                           */
/* ------------------------------------------------------------------ */
const registerUser = async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    // 1) 값 체크
    if (!username || !password || !nickname) {
      return res.status(400).json({
        message: '아이디, 비밀번호, 사용자 이름을 모두 입력해라.',
      });
    }

    // 2) 아이디 규칙: 영문+숫자만
    if (!ID_REGEX.test(username)) {
      return res.status(400).json({
        message: '아이디는 영문과 숫자만 사용할 수 있다.',
      });
    }

    // 3) 비밀번호 규칙: 영문+숫자만
    if (!PW_REGEX.test(password)) {
      return res.status(400).json({
        message: '비밀번호는 영문과 숫자만 사용할 수 있다.',
      });
    }

    // 4) 닉네임 규칙: 한글+영문+숫자
    if (!NICK_REGEX.test(nickname)) {
      return res.status(400).json({
        message: '사용자 이름은 한글, 영문, 숫자만 사용할 수 있다.',
      });
    }

    // 5) 아이디 중복 체크
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: '이미 사용 중인 아이디이다.' });
    }

    // 6) 비번 해시 후 저장
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      nickname,
    });

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOpts);

    return res.status(201).json({
      _id: user.id,
      username: user.username, // 아이디
      nickname: user.nickname, // 닉네임
      token,
      ok: true,
    });
  } catch (error) {
    return res.status(500).json({ message: '서버에 문제가 발생했다.' });
  }
};

/* ------------------------------------------------------------------ */
/*  로그인                                                             */
/*  POST /api/users/login                                              */
/* ------------------------------------------------------------------ */
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 값 체크
    if (!username || !password) {
      return res.status(400).json({ message: '아이디와 비밀번호를 입력해라.' });
    }

    // 아이디 형식 체크 (선택이지만 통일감 위해 넣음)
    if (!ID_REGEX.test(username)) {
      return res.status(400).json({ message: '아이디는 영문+숫자만 가능하다.' });
    }

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(400)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않는다.' });
    }

    const token = generateToken(user._id);
    res.cookie('token', token, cookieOpts);

    return res.status(200).json({
      _id: user.id,
      username: user.username,
      nickname: user.nickname, // 헤더 인사말 등에 사용 가능
      token,
      ok: true,
    });
  } catch (error) {
    return res.status(500).json({ message: '서버에 문제가 발생했다.' });
  }
};

/* ------------------------------------------------------------------ */
/*  내 정보 조회                                                       */
/*  GET /api/users/me                                                  */
/* ------------------------------------------------------------------ */
const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: '로그인이 필요하다.' });
  }
  const u = req.user;

  return res.status(200).json({
    _id: u._id,
    username: u.username,           // 아이디
    nickname: u.nickname,           // 닉네임
    linkedSpotify: !!u.spotifyAccessToken,
    createdAt: u.createdAt,
  });
};

/* ------------------------------------------------------------------ */
/*  로그아웃                                                           */
/*  POST /api/users/logout                                             */
/* ------------------------------------------------------------------ */
const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res.status(200).json({ ok: true });
};

/* ------------------------------------------------------------------ */
/*  SET UP 페이지 기능                                                 */
/* ------------------------------------------------------------------ */

/* 아이디(로그인용 username) 수정
 * PUT /api/users/me/username
 * body: { username }
 */
const updateUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user._id;

    if (!username) {
      return res.status(400).json({ message: '새 아이디를 입력해라.' });
    }

    // 아이디 규칙: 영문+숫자만
    if (!ID_REGEX.test(username)) {
      return res.status(400).json({
        message: '아이디는 영문과 숫자만 사용할 수 있다.',
      });
    }

    // 아이디 중복 확인 (본인은 제외)
    const userExists = await User.findOne({ username });
    if (userExists && userExists._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: '이미 사용 중인 아이디이다.' });
    }

    await User.findByIdAndUpdate(userId, { username });

    return res.status(200).json({ ok: true, message: '아이디가 수정되었다.' });
  } catch (error) {
    return res.status(500).json({ message: '아이디 수정 중 서버 오류.' });
  }
};

/* 닉네임(표시용 이름) 수정
 * PUT /api/users/me/nickname
 * body: { nickname }
 */
const updateNickname = async (req, res) => {
  try {
    const { nickname } = req.body;
    const userId = req.user._id;

    if (!nickname) {
      return res.status(400).json({ message: '새 닉네임을 입력해라.' });
    }

    // 닉네임 규칙: 한글+영문+숫자
    if (!NICK_REGEX.test(nickname)) {
      return res.status(400).json({
        message: '닉네임은 한글, 영문, 숫자만 사용할 수 있다.',
      });
    }

    await User.findByIdAndUpdate(userId, { nickname });

    return res.status(200).json({ ok: true, message: '닉네임이 수정되었다.' });
  } catch (error) {
    return res.status(500).json({ message: '닉네임 수정 중 서버 오류.' });
  }
};

/* 비밀번호 변경
 * PUT /api/users/me/password
 * body: { currentPassword, newPassword }
 */
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해라.' });
    }

    // 새 비밀번호 규칙: 영문+숫자만
    if (!PW_REGEX.test(newPassword)) {
      return res.status(400).json({
        message: '새 비밀번호는 영문과 숫자만 사용할 수 있다.',
      });
    }

    const user = await User.findById(userId);

    // 현재 비밀번호 확인
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res
        .status(400)
        .json({ message: '현재 비밀번호가 일치하지 않는다.' });
    }

    // 새 비밀번호 해싱 후 업데이트
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

    return res.status(200).json({ ok: true, message: '비밀번호가 변경되었다.' });
  } catch (error) {
    return res.status(500).json({ message: '비밀번호 변경 중 서버 오류.' });
  }
};

/* 회원 탈퇴
 * DELETE /api/users/me
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // MongoDB에서 사용자 레코드 삭제
    await User.findByIdAndDelete(userId);

    // 토큰 쿠키 삭제 (로그아웃 처리)
    res.clearCookie('token', cookieOpts);

    return res
      .status(200)
      .json({ ok: true, message: '계정이 성공적으로 삭제되었다.' });
  } catch (error) {
    return res.status(500).json({ message: '회원 탈퇴 중 서버 오류.' });
  }
};

/* ------------------------------------------------------------------ */
/*  exports                                                           */
/* ------------------------------------------------------------------ */
module.exports = {
  registerUser,
  loginUser,
  getMe,
  logout,
  updateUsername,   // 아이디 수정
  updateNickname,   // 닉네임 수정
  updatePassword,
  deleteAccount,
};
