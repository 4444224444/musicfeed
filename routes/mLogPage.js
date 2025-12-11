// server/routes/mLogPage.js
const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const User = require('../models/userModel');

// M-LOG 메인 페이지
router.get('/m-log', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
  .populate('friends', 'username nickname')
  .select('username nickname friends');

    res.render('m-log', {
      me,               // 변수 이름도 me로 맞추고
      friends: me.friends,
    });
  } catch (err) {
    console.error('M-LOG 페이지 렌더링 오류:', err);
    res.status(500).send('M-LOG 페이지를 불러오는 중 오류가 발생했다.');
  }
});

module.exports = router;
