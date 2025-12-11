const express = require('express');
const router = express.Router();

// User Controller에서 모든 함수를 가져옵니다.
const { 
    registerUser, 
    loginUser, 
    getMe, 
    logout,
    // SET UP에서 사용할 함수 추가
    updateUsername,
    updatePassword,
    deleteAccount,
} = require('../controllers/userController');

const { protect } = require('../middleware/authMiddleware');

// --- 인증 및 기본 기능 ---

// 회원가입
router.post('/register', registerUser);

// 로그인
router.post('/login', loginUser);

// 로그아웃 (쿠키 삭제)
// 💡 protect 미들웨어를 제거하여, 유효하지 않은 토큰이 있어도 쿠키 삭제 처리가 항상 실행되도록 합니다.
router.post('/logout', logout); 

// 내 정보 조회
router.get('/me', protect, getMe);


// --- 🟢 SET UP 페이지 기능 (로그인 필요) ---

// 사용자 이름 수정
router.put('/me/username', protect, updateUsername);

// 비밀번호 변경
router.put('/me/password', protect, updatePassword);

// 회원 탈퇴
router.delete('/me', protect, deleteAccount);


module.exports = router;
