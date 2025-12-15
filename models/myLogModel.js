// server/models/myLogModel.js
const mongoose = require('mongoose');

// 댓글 서브 스키마
const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true } // 댓글마다 고유 _id 필요
);

//  MY-LOG 스키마
const myLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 글 제목 (선택)
    title: {
      type: String,
      trim: true,
    },
    // 선택한 곡 정보
    track: {
      id: String,
      name: String,
      artist: String,
      album: String,
      albumCover: String,
      spotifyUrl: String,
    },
    // 내가 쓴 감상평(본문)
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // 댓글 배열
    comments: [commentSchema],
  },
  {
    timestamps: true, // createdAt, updatedAt 자동
  }
);

module.exports = mongoose.model('MyLog', myLogSchema);
