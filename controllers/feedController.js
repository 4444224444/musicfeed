const User = require('../models/userModel');
const axios = require('axios');

exports.getFriendFeed = async (req, res) => {
  try {
    // ================== ▼▼▼ 탐정 로그 1번 ▼▼▼ ==================
    console.log("\n\n--- 🕵️‍♂️ 친구 피드 디버깅 시작 ---");
    console.log(`[1] 요청한 사용자 ID: ${req.user.id}`);
    // ==========================================================

    const currentUser = await User.findById(req.user.id).populate(
      'friends',
      'username spotifyAccessToken' // 친구의 아이디와 토큰을 가져옵니다.
    );

    // ================== ▼▼▼ 탐정 로그 2번 ▼▼▼ ==================
    console.log("[2] DB에서 가져온 내 정보 (친구 목록 포함):");
    console.log(JSON.stringify(currentUser, null, 2));
    // ==========================================================

    if (!currentUser || currentUser.friends.length === 0) {
      console.log("[결론] 친구가 없어서 빈 배열을 반환합니다.");
      return res.status(200).json([]);
    }

    const friends = currentUser.friends;
    
    // ================== ▼▼▼ 탐정 로그 3번 ▼▼▼ ==================
    console.log(`[3] 총 ${friends.length}명의 친구 피드를 조회합니다.`);
    // ==========================================================
    
    const promises = friends.map(async (friend) => {
      // ================== ▼▼▼ 탐정 로그 4번 ▼▼▼ ==================
      console.log(`\n--- [4] 친구 '${friend.username}'의 기록을 조회합니다 ---`);
      console.log(`'${friend.username}'의 스포티파이 토큰: ${friend.spotifyAccessToken ? '있음 O' : '없음 X'}`);
      if(friend.spotifyAccessToken) console.log(`토큰 앞 10자리: ${friend.spotifyAccessToken.substring(0, 10)}...`);
      // =================================================================

      if (!friend.spotifyAccessToken) {
        return []; // 토큰 없으면 빈 배열 반환
      }

      try {
        // [수정된 부분] 여기가 가장 중요한 변경점입니다!
        // 'accounts.spotify.com/authorize'는 로그인 인증을 위한 주소이고,
        // 실제 데이터를 가져오려면 'api.spotify.com/v1/...' 형태의 API 주소를 사용해야 합니다.
        // 'me/player/recently-played'는 현재 사용자의 최근 재생 기록을 가져오는 올바른 API 주소입니다.
        const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
          headers: {
            Authorization: `Bearer ${friend.spotifyAccessToken}`,
          },
        });
        
        // ================== ▼▼▼ 탐정 로그 5번 ▼▼▼ ==================
        const trackCount = response.data.items ? response.data.items.length : 0;
        console.log(`'${friend.username}'의 최근 재생 기록 API 요청 성공! -> ${trackCount}개 노래 발견`);
        // ==========================================================

        // 스포티파이 API 응답 구조에 맞게 데이터를 가공합니다.
        return (response.data.items || []).map(item => ({
          friend: {
            id: friend._id,
            username: friend.username,
          },
          track: {
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists.map(artist => artist.name).join(', '),
            album: item.track.album.name,
            albumCover: item.track.album.images[0]?.url, // 첫 번째(가장 큰) 앨범 커버 이미지
            spotifyUrl: item.track.external_urls.spotify,
          },
          played_at: item.played_at,
        }));

      } catch (error) {
        // ================== ▼▼▼ 탐정 로그 6번 ▼▼▼ ==================
        console.error(`'${friend.username}'의 기록 조회 중 에러 발생!`);
        // 401 에러는 토큰 만료일 가능성이 높습니다.
        if (error.response && error.response.status === 401) {
            console.error("-> 401 Unauthorized: 친구의 스포티파이 토큰이 만료되었을 수 있습니다.");
        } else {
            console.error("-> 에러 메시지:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        }
        // ==========================================================
        return [];
      }
    });

    const results = await Promise.all(promises);
    const combinedFeed = [].concat(...results);
    combinedFeed.sort((a, b) => new Date(b.played_at) - new Date(a.played_at));
    const limitedFeed = combinedFeed.slice(0, 50);

    console.log("\n--- ✅ 최종 결과 ---");
    console.log(`총 ${limitedFeed.length}개의 피드 항목을 클라이언트에 보냅니다.\n\n`);

    res.status(200).json(limitedFeed);

  } catch (error) {
    console.error('Failed to get friend feed:', error);
    res.status(500).json({ message: '친구 피드를 가져오는 중 서버 에러가 발생했습니다.' });
  }
};
