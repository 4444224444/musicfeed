const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/feed/ 
router.get('/', protect, feedController.getFriendFeed);

module.exports = router;