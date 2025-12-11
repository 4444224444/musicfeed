// models/generatedPlaylistModel.js
const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema(
  {
    spotifyId: String,
    uri: String,
    name: String,
    artist: String,
    albumCover: String,
  },
  { _id: false }
);

const generatedPlaylistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  title: { type: String, required: true },
  description: { type: String },

  // 🔵 여기
  coverImage: {
    type: String, // base64 dataURL 또는 일반 URL
  },

  mood: { type: String },
  genre: { type: String },
  trackCount: { type: Number, default: 0 },
  pushedToSpotify: { type: Boolean, default: false },

  basedOn: {
    mode: String,
    mood: String,
    timeRange: String,
  },

  tracks: [trackSchema],

  spotifyPlaylistId: { type: String },
  spotifyPlaylistUrl: { type: String },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GeneratedPlaylist', generatedPlaylistSchema);

