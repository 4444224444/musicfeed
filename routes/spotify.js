const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');
const { protect } = require('../middleware/authMiddleware');

// 스포티파이 로그인(연동) 시작
router.get('/login', protect, spotifyController.loginWithSpotify);

// 이건 연동 해제
router.post('/disconnect', protect, spotifyController.disconnectSpotify);

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

// 이거 이제 스포티파이에서 끌고 올 거임 
router.get('/homepage-data', protect, spotifyController.getHomepageData);

router.get('/search', protect, spotifyController.searchTracks);

module.exports = router;

