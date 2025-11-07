const mongoose = require('mongoose');

// 여기가 스키마 
const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '아이디를 입력해주세요.'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, '비밀번호를 입력해주세요.'],
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
      },
    ],
    spotifyAccessToken: {
      type: String,
    },
    spotifyRefreshToken: {
      type: String,
    },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('User', userSchema);