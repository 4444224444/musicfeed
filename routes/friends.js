const express = require('express');
const router = express.Router();

// 🚨 이 부분에서 필요한 함수 3개를 모두 불러오고 있는지 확인해주세요!
const {
    searchUsers,
    addFriend,
    getFriends,
    removeFriend,
} = require('../controllers/friendController');

const { protect } = require('../middleware/authMiddleware');

// 모든 친구 관련 API는 로그인이 필요하므로 protect를 적용합니다.

// 친구 검색
router.route('/search').get(protect, searchUsers);

// 친구 추가
router.route('/add').post(protect, addFriend);

// 내 친구 목록 조회
router.route('/').get(protect, getFriends);

router.route('/remove').post(protect, removeFriend);


module.exports = router;