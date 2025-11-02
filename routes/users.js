const express = require('express');
const router = express.Router();

// 🔥 logout 포함해서 불러오기
const { registerUser, loginUser, getMe, logout } =
  require('../controllers/userController');

const { protect } = require('../middleware/authMiddleware');

// 회원가입
router.post('/register', registerUser);

// 로그인
router.post('/login', loginUser);

// 로그아웃 (쿠키 삭제)
router.post('/logout', protect, logout);

// 내 정보
router.get('/me', protect, getMe);

module.exports = router;

