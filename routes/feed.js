// routes/feed.js

const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/feed/ : 친구들의 청취 기록을 모아서 피드로 제공하는 라우터
router.get('/', protect, feedController.getFriendFeed);

module.exports = router;