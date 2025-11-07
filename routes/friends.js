const express = require('express');
const router = express.Router();


const {
    searchUsers,
    addFriend,
    getFriends,
    removeFriend,
} = require('../controllers/friendController');

const { protect } = require('../middleware/authMiddleware');

// 친구 검색
router.route('/search').get(protect, searchUsers);

// 친구 추가
router.route('/add').post(protect, addFriend);

// 내 친구 목록 조회
router.route('/').get(protect, getFriends);

router.route('/remove').post(protect, removeFriend);


module.exports = router;