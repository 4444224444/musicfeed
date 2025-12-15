// server/routes/playlists.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const { protect } = require('../middleware/authMiddleware');
const GeneratedPlaylist = require('../models/generatedPlaylistModel');
const User = require('../models/userModel');
const { refreshSpotifyToken } = require('../controllers/spotifyController');

// ===============================
// 공통: 유저의 Spotify 액세스 토큰 가져오기
// ===============================
const getValidAccessToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('사용자를 찾을 수 없습니다.');
  if (!user.spotifyAccessToken)
    throw new Error('Spotify 계정이 연동되지 않았습니다.');

  return user.spotifyAccessToken;
};

// ===============================
// 무드 프리셋 (간단한 버전)
// ===============================
const MOOD_PRESETS = {
  study: { titlePrefix: 'Study Mix' },
  chill: { titlePrefix: 'Chill Mix' },
  workout: { titlePrefix: 'Workout Mix' },
  happy: { titlePrefix: 'Happy Mix' },
};

// ===============================
// 1) 내 생성 플레이리스트 목록
// ===============================
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const lists = await GeneratedPlaylist.find({ userId })
      .sort({ createdAt: -1 });

    return res.status(200).json(lists);
  } catch (err) {
    console.error('플레이리스트 목록 조회 에러:', err.message);
    return res.status(500).json({ message: '플레이리스트 목록 조회 중 오류.' });
  }
});

// 플리 생성
router.post('/', protect, async (req, res) => {
  const userId = req.user._id;

  // 🔵 여기서 coverImage 같이 받기
  const { name, genre, coverImage } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: '플레이리스트 이름이 필요합니다.' });
  }

  if (!genre || !genre.trim()) {
    return res.status(400).json({ message: '장르(genre)가 필요합니다. 예: "k-pop", "jazz"' });
  }

  try {
    let accessToken = await getValidAccessToken(userId);
    let headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const genreStr = genre.trim();

    // 1) 장르 기반 아티스트 검색
    const artistSearchParams = {
      q: `genre:"${genreStr}"`,
      type: 'artist',
      limit: 5, // 상위 아티스트 몇 명만
    };

    console.log('🎯 Spotify artist search params:', artistSearchParams);

    const doGet = (url, params) =>
      axios.get(url, {
        headers,
        params,
      });

    let artistSearchResp;
    try {
      artistSearchResp = await doGet(
        'https://api.spotify.com/v1/search',
        artistSearchParams
      );
    } catch (err) {
      if (err.response?.status === 401) {
        // 토큰 만료 → 리프레시 후 재시도
        accessToken = await refreshSpotifyToken(userId);
        headers.Authorization = `Bearer ${accessToken}`;
        artistSearchResp = await doGet(
          'https://api.spotify.com/v1/search',
          artistSearchParams
        );
      } else {
        console.error(
          'Spotify artist search 오류:',
          err.response?.data || err.message
        );
        return res
          .status(500)
          .json({ message: '장르 아티스트 검색 중 오류가 발생했다.' });
      }
    }

    const artists = artistSearchResp?.data?.artists?.items || [];
    let collectedTracks = [];

    if (artists.length) {
      // 2) 각 아티스트의 Top Tracks 가져오기
      const topTrackPromises = artists.map((artist) =>
        doGet(
          `https://api.spotify.com/v1/artists/${artist.id}/top-tracks`,
          { market: 'KR' } // 필요하면 'US'로 바꿔도 됨
        )
      );

      try {
        const topTrackResponses = await Promise.all(topTrackPromises);
        topTrackResponses.forEach((r) => {
          const tracks = r?.data?.tracks || [];
          collectedTracks.push(...tracks);
        });
      } catch (err) {
        console.error(
          'Top tracks 가져오는 중 오류:',
          err.response?.data || err.message
        );
      }
    }

    // 3) 만약 아티스트/TopTracks에서 아무 곡도 못 모았다면 → fallback: 트랙 검색
    if (!collectedTracks.length) {
      console.log('⚠️ 아티스트 기반 TopTracks가 없어, 트랙 검색으로 fallback');

      const trackSearchParams = {
        q: genreStr,
        type: 'track',
        limit: 30, // 넉넉하게 받아서 10곡 샘플링
      };

      let trackSearchResp;
      try {
        trackSearchResp = await doGet(
          'https://api.spotify.com/v1/search',
          trackSearchParams
        );
      } catch (err) {
        console.error(
          'Spotify track search fallback 오류:',
          err.response?.data || err.message
        );
        return res
          .status(500)
          .json({ message: 'Spotify 곡 검색 오류(fallback).' });
      }

      collectedTracks = trackSearchResp?.data?.tracks?.items || [];
    }

    if (!collectedTracks.length) {
      return res.status(400).json({
        message: '해당 장르에서 곡을 찾지 못했다. 다른 장르를 시도해 달라.',
      });
    }

    // 4) 중복 제거 + 랜덤 섞기 + 10곡 선택
    const seen = new Set();
    const uniqueTracks = [];
    for (const t of collectedTracks) {
      if (!t || !t.id) continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      uniqueTracks.push(t);
    }

    if (!uniqueTracks.length) {
      return res.status(400).json({
        message: '해당 장르에서 곡을 찾지 못했다. 다른 장르를 시도해 달라.',
      });
    }

    // 간단한 셔플
    uniqueTracks.sort(() => Math.random() - 0.5);
    const finalTracksSpotify = uniqueTracks.slice(0, 10);

    const tracks = finalTracksSpotify.map((t) => ({
      name: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      albumCover:
        t.album?.images?.[1]?.url ||
        t.album?.images?.[0]?.url ||
        null,
      uri: t.uri,
    }));

    const payload = {
      userId,
      title: name.trim(),
      mood: null,
      genre: genreStr,
      trackCount: tracks.length,
      tracks,
      pushedToSpotify: false,
      createdAt: new Date(),
      coverImage: coverImage || null,
    };

    console.log('🧪 저장 payload (genre → artists → top tracks):', payload);

    const playlistDoc = await GeneratedPlaylist.create(payload);
    return res.status(201).json(playlistDoc);
  } catch (err) {
    console.error('플레이리스트 생성 오류:', err);
    return res.status(500).json({ message: '플레이리스트 생성 오류.' });
  }
});



// ===============================
// 3) 상세 조회
// ===============================
router.get('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const playlist = await GeneratedPlaylist.findOne({
      _id: req.params.id,
      userId,         // 🔥 owner → userId
    });

    if (!playlist)
      return res.status(404).json({ message: '플레이리스트 없음.' });

    res.status(200).json(playlist);
  } catch (err) {
    console.error('상세 조회 오류:', err.message);
    res.status(500).json({ message: '플리 조회 오류.' });
  }
});

// ===============================
// 4) Spotify 계정에 Push
// ===============================
router.post('/:id/push', protect, async (req, res) => {
  const userId = req.user._id;
  const playlistId = req.params.id;

  try {
    const playlist = await GeneratedPlaylist.findOne({
      _id: playlistId,
      userId,          // 🔥 owner → userId
    });

    if (!playlist)
      return res.status(404).json({ message: '플레이리스트 없음.' });

    let accessToken = await getValidAccessToken(userId);
    let headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // Spotify user id 얻기
    let meResp = await axios.get('https://api.spotify.com/v1/me', { headers });
    const spotifyUserId = meResp.data.id;

    // Spotify에 새 플레이리스트 생성
    const playlistName = playlist.name || playlist.title || 'Generated Playlist';

const createResp = await axios.post(
  `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`,
  {
    name: playlistName,
    description: 'NowPlaying 자동 생성',
    public: false,
  },
  { headers }
);

    const spotifyPlaylistId = createResp.data.id;

    // 트랙 추가
    const uris = playlist.tracks.map((t) => t.uri).filter(Boolean);
    if (uris.length) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
        { uris },
        { headers }
      );
    }

    playlist.pushedToSpotify = true;
    playlist.spotifyPlaylistId = spotifyPlaylistId;
    await playlist.save();

    return res.status(200).json({
      ok: true,
      spotifyPlaylistUrl: createResp.data.external_urls?.spotify || null,
    });
  } catch (err) {
    console.error('Push 오류:', err.message);
    return res.status(500).json({ message: 'Push 중 오류.' });
  }
});

module.exports = router;
