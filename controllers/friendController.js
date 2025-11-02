const User = require('../models/userModel');

const searchUsers = async (req, res) => {
    const keyword = req.query.username
        ? {
              username: {
                  $regex: req.query.username,
                  $options: 'i',
              },
          }
        : {};

    const users = await User.find(keyword)
        .find({ _id: { $ne: req.user._id } })
        .select('-password');
    res.json(users);
};

const addFriend = async (req, res) => {
    const { friendId } = req.body;
    if (!friendId) {
        return res.status(400).json({ message: 'Friend ID is required' });
    }
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $addToSet: { friends: req.user._id } });
    res.status(200).json({ message: 'Friend added successfully' });
};

const getFriends = async (req, res) => {
    const user = await User.findById(req.user._id).populate('friends', 'username');
    res.status(200).json(user.friends);
};

// 친구 삭제
const removeFriend = async (req, res) => {
  const { friendId } = req.body;
  if (!friendId) {
    return res.status(400).json({ message: 'Friend ID가 필요합니다.' });
  }

  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } });
    res.status(200).json({ message: '친구가 삭제되었습니다.' });
  } catch (error) {
    console.error('❌ 친구 삭제 중 오류:', error);
    res.status(500).json({ message: '친구 삭제에 실패했습니다.' });
  }
};

module.exports = {
  searchUsers,
  addFriend,
  getFriends,
  removeFriend, // ✅ 추가
};