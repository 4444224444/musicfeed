const querystring = require('querystring');
const axios = require('axios');
const User = require('../models/userModel');

// 1) 토큰 재발급
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
      'Authorization': 'Basic ' + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
      ).toString('base64'),
    },
  });

  const newAccessToken = resp.data.access_token;
  await User.findByIdAndUpdate(userId, { spotifyAccessToken: newAccessToken });
  return newAccessToken;
};

// 2) 연동 시작
exports.loginWithSpotify = (req, res) => {
  const scope = 'user-read-private user-read-email user-read-currently-playing user-read-recently-played';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope,
      redirect_uri: 'http://127.0.0.1:5000/api/spotify/callback',
      state: req.user.id,
      show_dialog: true,
    }));
};

// 3) 콜백
exports.spotifyCallback = async (req, res) => {
  const code = req.query.code || null;
  const userId = req.query.state || null;
  const error = req.query.error || null;

  if (error) {
    console.log('[스포티파이 연동 취소]', error);
    return res.redirect('/'); // 에러 시도 홈으로
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
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64'),
      },
    });

    const { access_token, refresh_token } = tokenResp.data;

    await User.findByIdAndUpdate(
      userId,
      { spotifyAccessToken: access_token, spotifyRefreshToken: refresh_token },
      { new: true }
    );

    // 연동 성공 후 EJS 홈으로
    return res.redirect('/');
  } catch (err) {
    console.error('스포티파이 토큰 요청 에러:', err.response ? err.response.data : err.message);
    return res.status(500).send('스포티파이 토큰 처리 중 에러');
  }
};

// 4) 최근 재생
exports.getRecentTracks = async (req, res) => {
  let accessToken = req.user.spotifyAccessToken;
  const userId = req.user.id;
  if (!accessToken) return res.status(400).json({ message: '스포티파이 계정이 연동되지 않았습니다.' });

  try {
    const r = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return res.status(200).json(r.data.items || []);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const rr = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
          headers: { Authorization: `Bearer ${newTok}` }
        });
        return res.status(200).json(rr.data.items || []);
      } catch {
        return res.status(500).json({ message: '토큰 재발급 후 재시도 중 에러' });
      }
    }
    console.error('최근 재생 에러:', error.response ? error.response.data : error.message);
    return res.status(500).json({ message: '최근 재생 목록 에러' });
  }
};

// 5) 프로필
exports.getSpotifyProfile = async (req, res) => {
  let accessToken = req.user.spotifyAccessToken;
  const userId = req.user.id;
  if (!accessToken) return res.status(400).json({ message: '스포티파이 계정이 연동되지 않았습니다.' });

  try {
    const r = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return res.status(200).json(r.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const newTok = await refreshSpotifyToken(userId);
        const rr = await axios.get('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${newTok}` }
        });
        return res.status(200).json(rr.data);
      } catch {
        return res.status(500).json({ message: '토큰 재발급 후 재시도 중 에러' });
      }
    }
    console.error('프로필 에러:', error.response ? error.response.data : error.message);
    return res.status(500).json({ message: '프로필 조회 에러' });
  }
};

// 6) 현재 재생
exports.getCurrentlyPlaying = async (req, res) => {
  let accessToken = req.user.spotifyAccessToken;
  const userId = req.user.id;
  if (!accessToken) {
    return res.status(400).json({ is_playing: false, message: '스포티파이 계정이 연동되지 않았습니다.' });
  }

  const fetchNow = async (token) => {
    const r = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (r.status === 204 || !r.data || !r.data.item) {
      return { is_playing: false };
    }
    const item = r.data.item;
    return {
      is_playing: !!r.data.is_playing,
      trackName: item.name,
      artist: Array.isArray(item.artists) ? item.artists.map(a => a.name).join(', ') : (item.show?.publisher || ''),
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
        return res.status(500).json({ is_playing: false, message: '토큰 재발급 후 재시도 중 에러' });
      }
    }
    console.error('현재 재생 에러:', error.response ? error.response.data : error.message);
    return res.status(500).json({ is_playing: false, message: '현재 재생 조회 에러' });
  }
};
