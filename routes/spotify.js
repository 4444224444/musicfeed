const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');
const { protect } = require('../middleware/authMiddleware');

// 스포티파이 로그인(연동) 시작
router.get('/login', protect, spotifyController.loginWithSpotify);

// 스포티파이 콜백
router.get('/callback', spotifyController.spotifyCallback);

// 최근 재생
router.get('/recent', protect, spotifyController.getRecentTracks);

// 프로필
router.get('/me', protect, spotifyController.getSpotifyProfile);

// 현재 재생 (정식 경로)
router.get('/currently-playing', protect, spotifyController.getCurrentlyPlaying);

// 여기 테스트
router.get('/current', protect, spotifyController.getCurrentlyPlaying);
router.get('/now', protect, spotifyController.getCurrentlyPlaying);

module.exports = router;

