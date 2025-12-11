const querystring = require('querystring');
const axios = require('axios');
const User = require('../models/userModel');

// 🔥 글로벌 차트용 플레이리스트 (Topsify 같은 큐레이터 계정 플리)
const GLOBAL_CHART_PLAYLIST_ID = '5iwkYfnHAGMEFLiHFFGnP4';
const GLOBAL_CHART_TITLE = '🔥 글로벌 차트 Top 10';
const GLOBAL_CHART_SUBTITLE = "HITS 2025 - Today's Top Songs (by Topsify)";

const GeneratedPlaylist = require('../models/generatedPlaylistModel');

// 무드별 추천 파라미터 프리셋
const MOOD_PRESETS = {
  study: {
    titlePrefix: 'Study Mix',
    target_energy: 0.4,
    target_danceability: 0.4,
    target_valence: 0.3,
  },
  chill: {
    titlePrefix: 'Chill Mix',
    target_energy: 0.35,
    target_danceability: 0.4,
    target_valence: 0.4,
  },
  workout: {
    titlePrefix: 'Workout Mix',
    target_energy: 0.8,
    target_danceability: 0.7,
    target_valence: 0.7,
  },
  happy: {
    titlePrefix: 'Happy Mix',
    target_energy: 0.7,
    target_danceability: 0.7,
    target_valence: 0.9,
  },
};

// 기본 무드
const DEFAULT_MOOD = 'chill';

// ===============================
// 1) 토큰 재발급
// ===============================
const refreshSpotifyToken = async (userId) => {
  const user = await User.findById(userId);
  const refreshToken = user.spotifyRefreshToken;
  if (!refreshToken) throw new Error('리프레시 토큰이 존재하지 않습니다.');

  const resp = await axios({
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID +
            ':' +
            process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64'),
    },
  });

  const newAccessToken = resp.data.access_token;
  await User.findByIdAndUpdate(userId, { spotifyAccessToken: newAccessToken });
  return newAccessToken;
};

// ===============================
// 2) 연동 시작
// ===============================
const loginWithSpotify = (req, res) => {
  const scope = [
    'user-read-private',
    'user-read-email',
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-top-read',
    'playlist-read-private',
    'playlist-modify-private',
    'playlist-modify-public',
  ].join(' ');

  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope,
        redirect_uri: 'http://127.0.0.1:5000/api/spotify/callback',
        state: req.user.id,
        show_dialog: true,
      })
  );
};

// ===============================
// 3) 콜백
// ===============================
const spotifyCallback = async (req, res) => {
  const code = req.query.code || null;
  const userId = req.query.state || null;
  const error = req.query.error || null;

  if (error) {
    console.log('[스포티파이 연동 취소]', error);
    return res.redirect('/');
  }
  if (!userId) return res.status(400).send('사용자 ID(state)를 찾을 수 없습니다.');

  try {
    const tokenResp = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://127.0.0.1:5000/api/spotify/callback',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID +
              ':' +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString('base64'),
      },
    });

    const { access_token, refresh_token } = tokenResp.data;

    await User.findByIdAndUpdate(
      userId,
      {
        spotifyAccessToken: access_token,
        spotifyRefreshToken: refresh_token,
      },
      { new: true }
    );

    return res.redirect('/');
  } catch (err) {
    console.error(
      '스포티파이 토큰 요청 에러:',
      err.response ? err.response.data : err.message
    );
    return res.status(500).send('스포티파이 토큰 처리 중 에러');
  }
};

// ===============================
// 4) 최근 재생
// ===============================
const getRecentTracks = async (req, res) => {
  let accessToken = req.user.spotifyAccessToken;
  const userId = req.user.id;

  if (!accessToken)
    return res
      .status(400)
      .json({ message: '스포티파이 계정이 연동되지 않았습니다.' });

  try {
    const r = await axios.get(
      'https://api.spotify.com/v1/me/player/recently-played?limit=20',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return res.status(200).json(r.data.items || []);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const rr = await axios.get(
          'https://api.spotify.com/v1/me/player/recently-played?limit=20',
          { headers: { Authorization: `Bearer ${newTok}` } }
        );
        return res.status(200).json(rr.data.items || []);
      } catch {
        return res
          .status(500)
          .json({ message: '토큰 재발급 후 재시도 중 에러' });
      }
    }

    console.error('최근 재생 에러:', error.response?.data || error.message);
    return res.status(500).json({ message: '최근 재생 목록 에러' });
  }
};

// ===============================
// 5) 프로필
// ===============================
const getSpotifyProfile = async (req, res) => {
  let accessToken = req.user.spotifyAccessToken;
  const userId = req.user.id;

  if (!accessToken)
    return res
      .status(400)
      .json({ message: '스포티파이 계정이 연동되지 않았습니다.' });

  try {
    const r = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.status(200).json(r.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const rr = await axios.get('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${newTok}` },
        });
        return res.status(200).json(rr.data);
      } catch {
        return res
          .status(500)
          .json({ message: '토큰 재발급 후 재시도 중 에러' });
      }
    }

    console.error('프로필 에러:', error.response?.data || error.message);
    return res.status(500).json({ message: '프로필 조회 에러' });
  }
};

// ===============================
// 6) 현재 재생
// ===============================
const getCurrentlyPlaying = async (req, res) => {
  let accessToken = req.user.spotifyAccessToken;
  const userId = req.user.id;

  if (!accessToken) {
    return res.status(400).json({
      is_playing: false,
      message: '스포티파이 계정이 연동되지 않았습니다.',
    });
  }

  const fetchNow = async (token) => {
    const r = await axios.get(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (r.status === 204 || !r.data || !r.data.item) {
      return { is_playing: false };
    }

    const item = r.data.item;

    return {
      is_playing: !!r.data.is_playing,
      trackName: item.name,
      artist: Array.isArray(item.artists)
        ? item.artists.map((a) => a.name).join(', ')
        : item.show?.publisher || '',
      albumCover: item.album?.images?.[0]?.url || item.images?.[0]?.url || null,
    };
  };

  try {
    const np = await fetchNow(accessToken);
    return res.status(200).json(np);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const np = await fetchNow(newTok);
        return res.status(200).json(np);
      } catch {
        return res.status(500).json({
          is_playing: false,
          message: '토큰 재발급 후 재시도 중 에러',
        });
      }
    }

    console.error('현재 재생 에러:', error.response?.data || error.message);
    return res.status(500).json({
      is_playing: false,
      message: '현재 재생 조회 에러',
    });
  }
};

// ===============================
// 7) Spotify 연동 해제
// ===============================
const disconnectSpotify = async (req, res) => {
  try {
    const userId = req.user._id;

    await User.findByIdAndUpdate(
      userId,
      { $unset: { spotifyAccessToken: 1, spotifyRefreshToken: 1 } },
      { new: true }
    );

    return res
      .status(200)
      .json({ ok: true, message: 'Spotify 연동이 해제되었습니다.' });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Spotify 연동 해제 중 서버 오류.' });
  }
};

// ===============================
// 8) 홈 데이터
// ===============================
const getHomepageData = async (req, res) => {
  const userId = req.user.id;
  let accessToken = req.user.spotifyAccessToken;

  if (!accessToken) {
    return res.status(400).json({ message: 'Spotify 연동 정보가 없습니다.' });
  }

  const fetchHomepage = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };

    const [myTopTracksResp, myTopArtistsResp, chartResp] = await Promise.all([
      axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers,
        params: {
          limit: 10,
          time_range: 'medium_term',
        },
      }),
      axios.get('https://api.spotify.com/v1/me/top/artists', {
        headers,
        params: {
          limit: 3,
          time_range: 'medium_term',
        },
      }),
      axios.get(
        `https://api.spotify.com/v1/playlists/${GLOBAL_CHART_PLAYLIST_ID}`,
        {
          headers,
          params: {
            fields:
              'name,images,external_urls,tracks.items(track(name,uri,artists(name),album(images))),tracks.total',
            market: 'KR',
          },
        }
      ),
    ]);

    // 1) 내 Top 트랙 10곡
    const myTopTracks = (myTopTracksResp.data.items || []).map((track) => ({
      name: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      albumCover:
        track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
      uri: track.uri,
    }));

    // 2) 내 Top 아티스트 3명
    const myTopArtists = (myTopArtistsResp.data.items || []).map((artist) => ({
      name: artist.name,
      genres: artist.genres || [],
      image: artist.images?.[0]?.url || null,
      uri: artist.uri,
    }));

    // 3) 글로벌 차트 Top10
    const playlist = chartResp.data;
    const items = playlist.tracks?.items || [];

    const globalTopTracks = items
      .filter((item) => item && item.track)
      .slice(0, 10)
      .map((item) => {
        const track = item.track;
        return {
          name: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          albumCover:
            track.album?.images?.[1]?.url ||
            track.album?.images?.[0]?.url ||
            null,
          uri: track.uri,
        };
      });

    return {
      ok: true,
      myTopTracks: {
        title: '📈 내가 많이 들은 곡 Top 10',
        subtitle: '최근 몇 달간 자주 재생한 트랙',
        tracks: myTopTracks,
      },
      myTopArtists: {
        title: '👤 내가 많이 들은 아티스트 Top 3',
        subtitle: '요즘 자주 듣는 아티스트',
        artists: myTopArtists,
      },
      globalTop: {
        title: GLOBAL_CHART_TITLE,
        subtitle: GLOBAL_CHART_SUBTITLE,
        playlistId: GLOBAL_CHART_PLAYLIST_ID,
        playlistName: playlist.name,
        spotifyUrl: playlist.external_urls?.spotify || null,
        image: playlist.images?.[0]?.url || null,
        tracks: globalTopTracks,
      },
    };
  };

  try {
    const data = await fetchHomepage(accessToken);
    return res.status(200).json(data);
  } catch (error) {
    console.error('홈 데이터 에러 상태코드:', error.response?.status);
    console.error('홈 데이터 에러 데이터:', error.response?.data);
    console.error('홈 데이터 에러 메시지:', error.message);

    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const data = await fetchHomepage(newTok);
        return res.status(200).json(data);
      } catch (err2) {
        console.error('홈 데이터 재시도 에러 상태코드:', err2.response?.status);
        console.error('홈 데이터 재시도 에러 데이터:', err2.response?.data);
        console.error('홈 데이터 재시도 에러 메시지:', err2.message);

        return res.status(500).json({
          message:
            '서버 처리 오류(재시도): ' +
            (err2.response?.data?.error?.message || err2.message),
        });
      }
    }

    const errorMessage =
      error.response?.data?.error?.message ||
      error.message ||
      'Spotify API 호출 중 오류 발생';

    return res
      .status(500)
      .json({ message: `서버 처리 오류: ${errorMessage}` });
  }
};

// ===============================
// 9) 추천 플레이리스트 생성 (플리메이커용)
// ===============================
const generateMoodPlaylist = async (req, res) => {
  const userId = req.user.id;
  let accessToken = req.user.spotifyAccessToken;

  if (!accessToken) {
    return res.status(400).json({ message: 'Spotify 연동 정보가 없습니다.' });
  }

  const mood = (req.body.mood || DEFAULT_MOOD).toLowerCase();
  const preset = MOOD_PRESETS[mood] || MOOD_PRESETS[DEFAULT_MOOD];

  const fetchSeeds = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };

    const [topTracksResp, topArtistsResp] = await Promise.all([
      axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers,
        params: { limit: 5, time_range: 'short_term' },
      }),
      axios.get('https://api.spotify.com/v1/me/top/artists', {
        headers,
        params: { limit: 5, time_range: 'short_term' },
      }),
    ]);

    const trackItems = topTracksResp.data.items || [];
    const artistItems = topArtistsResp.data.items || [];

    const seedTracks = trackItems.slice(0, 2).map((t) => t.id);
    const seedArtists = artistItems.slice(0, 3).map((a) => a.id);

    return { seedTracks, seedArtists };
  };

  const fetchRecommendations = async (token, seedTracks, seedArtists) => {
    const params = {
      limit: 25,
      seed_tracks: seedTracks.join(','),
      seed_artists: seedArtists.join(','),
      target_energy: preset.target_energy,
      target_danceability: preset.target_danceability,
      target_valence: preset.target_valence,
    };

    const recResp = await axios.get(
      'https://api.spotify.com/v1/recommendations',
      {
        headers: { Authorization: `Bearer ${token}` },
        params,
      }
    );

    const recTracks = recResp.data.tracks || [];

    const tracks = recTracks.map((track) => ({
      spotifyId: track.id,
      uri: track.uri,
      name: track.name,
      artist: (track.artists || []).map((a) => a.name).join(', '),
      albumCover:
        track.album?.images?.[1]?.url ||
        track.album?.images?.[0]?.url ||
        null,
    }));

    if (!tracks.length) {
      throw new Error('추천 트랙을 불러오지 못했습니다.');
    }

    return tracks;
  };

  try {
    const { seedTracks, seedArtists } = await fetchSeeds(accessToken);
    const tracks = await fetchRecommendations(
      accessToken,
      seedTracks,
      seedArtists
    );

    const title = `${preset.titlePrefix} · ${new Date().toLocaleDateString(
      'ko-KR'
    )}`;

    const doc = await GeneratedPlaylist.create({
  userId,
  title,
  description: `${mood} 무드와 최근 청취곡을 기반으로 생성된 플레이리스트입니다.`,
  basedOn: {
    mode: 'mood',
    mood,
    timeRange: 'short_term',
  },
  tracks,
  coverImage: coverImage || null,   // 여기도 동일하게
});

    return res.status(201).json({
      ok: true,
      playlist: doc,
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const { seedTracks, seedArtists } = await fetchSeeds(newTok);
        const tracks = await fetchRecommendations(
          newTok,
          seedTracks,
          seedArtists
        );

        const title = `${preset.titlePrefix} · ${new Date().toLocaleDateString(
          'ko-KR'
        )}`;

        const { coverImage } = req.body;  // 👈 맨 위쪽 try 안에 한 줄 추가해도 됨

const doc = await GeneratedPlaylist.create({
  userId,
  title,
  description: `${mood} 무드와 최근 청취곡을 기반으로 생성된 플레이리스트입니다.`,
  basedOn: {
    mode: 'mood',
    mood,
    timeRange: 'short_term',
  },
  tracks,
  coverImage: coverImage || null,   // 🔥 여기 추가
});

        return res.status(201).json({ ok: true, playlist: doc });
      } catch (err2) {
        console.error(
          '추천 플리 재시도 에러:',
          err2.response?.data || err2.message
        );
        return res
          .status(500)
          .json({ message: '추천 플레이리스트 생성 중 오류(재시도).' });
      }
    }

    console.error(
      '추천 플레이리스트 생성 에러:',
      error.response?.data || error.message
    );
    return res
      .status(500)
      .json({ message: '추천 플레이리스트 생성 중 오류.' });
  }
};

// ===============================
// 10) 내가 만든 추천 플레이리스트 목록 조회
// ===============================
const getMyGeneratedPlaylists = async (req, res) => {
  const userId = req.user.id;

  try {
    const docs = await GeneratedPlaylist.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ ok: true, playlists: docs });
  } catch (error) {
    console.error(
      '추천 플레이리스트 목록 조회 에러:',
      error.message
    );
    return res
      .status(500)
      .json({ message: '추천 플레이리스트 목록 조회 중 오류.' });
  }
};

// ===============================
// 11) 생성된 추천플리를 실제 Spotify 계정에 플레이리스트로 만들기
// ===============================
const pushGeneratedPlaylistToSpotify = async (req, res) => {
  const userId = req.user.id;
  const docId = req.params.id;
  let accessToken = req.user.spotifyAccessToken;

  if (!accessToken) {
    return res.status(400).json({ message: 'Spotify 연동 정보가 없습니다.' });
  }

  try {
    const playlistDoc = await GeneratedPlaylist.findOne({ _id: docId, userId });

    if (!playlistDoc) {
      return res
        .status(404)
        .json({ message: '추천 플레이리스트를 찾을 수 없습니다.' });
    }

    if (playlistDoc.spotifyPlaylistId && playlistDoc.spotifyPlaylistUrl) {
      return res.status(200).json({
        ok: true,
        alreadyCreated: true,
        spotifyPlaylistId: playlistDoc.spotifyPlaylistId,
        spotifyPlaylistUrl: playlistDoc.spotifyPlaylistUrl,
      });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    // 1) Spotify 사용자 프로필에서 user id 가져오기
    const meResp = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const spotifyUserId = meResp.data.id;

    // 2) 해당 사용자 계정에 플레이리스트 생성
    const createResp = await axios.post(
      `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`,
      {
        name: playlistDoc.title,
        description:
          playlistDoc.description ||
          'NowPlaying에서 생성한 추천 플레이리스트',
        public: false,
      },
      { headers }
    );

    const spotifyPlaylistId = createResp.data.id;
    const spotifyPlaylistUrl =
      createResp.data.external_urls?.spotify ||
      `https://open.spotify.com/playlist/${spotifyPlaylistId}`;

    // 3) 트랙들 추가
    const uris = (playlistDoc.tracks || [])
      .map((t) => t.uri)
      .filter(Boolean);

    if (uris.length) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/tracks`,
        { uris },
        { headers }
      );
    }

    playlistDoc.spotifyPlaylistId = spotifyPlaylistId;
    playlistDoc.spotifyPlaylistUrl = spotifyPlaylistUrl;
    await playlistDoc.save();

    return res.status(200).json({
      ok: true,
      spotifyPlaylistId,
      spotifyPlaylistUrl,
    });
  } catch (error) {
    console.error(
      'Spotify 플레이리스트 생성/추가 에러:',
      error.response?.data || error.message
    );
    return res.status(500).json({
      message: 'Spotify 계정에 플레이리스트 생성 중 오류.',
    });
  }
};

// ===============================
// 12) 트랙 검색 (MY-LOG용)
// GET /api/spotify/search?query=... 
// ===============================
const searchTracks = async (req, res) => {
  const userId = req.user.id;
  let accessToken = req.user.spotifyAccessToken;

  const q = (req.query.query || '').trim();
  if (!q) {
    return res.status(400).json({ message: '검색어가 비어 있다.' });
  }

  if (!accessToken) {
    return res
      .status(400)
      .json({ message: 'Spotify 연동 정보가 없습니다.' });
  }

  const doSearch = async (token) => {
    const headers = { Authorization: `Bearer ${token}` };

    const r = await axios.get('https://api.spotify.com/v1/search', {
      headers,
      params: {
        q,                     // 사용자가 입력한 검색어 그대로
        type: 'track',
        market: 'KR',
        limit: 8,
        include_external: 'audio',
      },
    });

    const items = r.data?.tracks?.items || [];

    const results = items.map((t) => ({
      id: t.id,
      name: t.name,
      artist: (t.artists || []).map((a) => a.name).join(', '),
      albumCover:
        t.album?.images?.[1]?.url ||
        t.album?.images?.[0]?.url ||
        null,
      spotifyUrl: t.external_urls?.spotify || '',
    }));

    return results;
  };

  try {
    const results = await doSearch(accessToken);
    return res.status(200).json(results);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const results = await doSearch(newTok);
        return res.status(200).json(results);
      } catch (err2) {
        console.error(
          'searchTracks 재시도 에러:',
          err2.response?.data || err2.message
        );
        return res
          .status(500)
          .json({ message: '검색 재시도 중 오류가 발생했다.' });
      }
    }

    console.error(
      'searchTracks 에러:',
      error.response?.data || error.message
    );
    return res
      .status(500)
      .json({ message: 'Spotify 검색 중 오류가 발생했다.' });
  }
};

module.exports = {
  refreshSpotifyToken,
  loginWithSpotify,
  spotifyCallback,
  getRecentTracks,
  getSpotifyProfile,
  getCurrentlyPlaying,
  disconnectSpotify,
  getHomepageData,
  generateMoodPlaylist,
  getMyGeneratedPlaylists,
  pushGeneratedPlaylistToSpotify,
  searchTracks,      // 🔥 라우트에서 쓰는 이름
};
