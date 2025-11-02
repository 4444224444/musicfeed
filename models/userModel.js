const mongoose = require('mongoose');

// 사용자의 데이터 구조(Schema)를 정의합니다.
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
        ref: 'User', // 'User' 모델 참조
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
    timestamps: true, // 데이터 생성/수정 시간을 자동으로 기록
  }
);

// 이 설계도를 'User'라는 이름의 모델로 만들어서 외부에서 사용할 수 있도록 내보냅니다.
module.exports = mongoose.model('User', userSchema);