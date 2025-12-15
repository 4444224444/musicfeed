const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    // 로그인 아이디
    username: {
      type: String,
      required: [true, '아이디를 입력해주세요.'],
      unique: true,
    },

    // 닉넴
    nickname: {
      type: String,
      required: [true, '사용자 이름(닉네임)을 입력해주세요.'],
    },

    // 비밀번호
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

    spotifyAccessToken: String,
    spotifyRefreshToken: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
