// server/routes/mylog.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const myLogController = require('../controllers/myLogController');

// 내 전체 로그 (API에서 쓰고 있을 수도 있음)
router.get('/', protect, myLogController.getMyLogs);

// 유저별 로그 (지금 mylog.ejs에서 /api/mylog/user/:userId 호출 중)
router.get('/user/:userId', protect, myLogController.getUserLogs);

// 피드 (M-LOG에서 쓰는 거)
router.get('/feed', protect, myLogController.getFeedLogs);

// 새 글 작성
router.post('/', protect, myLogController.createMyLog);

// 글 수정 / 삭제
router.put('/:id', protect, myLogController.updateMyLog);
router.delete('/:id', protect, myLogController.deleteMyLog);

// 🔹 글 상세 (본문 + 댓글)
router.get('/post/:id', protect, myLogController.getMyLogDetail);

// 🔹 댓글 추가
router.post('/:id/comments', protect, myLogController.addComment);

// 🔹 댓글 삭제
router.delete('/comments/:commentId', protect, myLogController.deleteComment);

module.exports = router;
