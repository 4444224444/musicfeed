// public/js/m-log.js

document.addEventListener('DOMContentLoaded', () => {
  const feedContainer = document.getElementById('mlog-feed');
  const myProfileEl = document.getElementById('mlog-my-profile');
  const friendItems = document.querySelectorAll('.mlog-friend-item');

  // 1) 홈 피드 불러오기 (나 + 친구들)
  loadFeed();

  async function loadFeed() {
    if (!feedContainer) return;

    feedContainer.innerHTML = '<p>피드를 불러오는 중이다...</p>';

    try {
      const res = await fetch('/api/mylog/feed', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('피드 요청 실패');
      }
      const logs = await res.json();
      renderFeed(logs);
    } catch (err) {
      console.error(err);
      feedContainer.innerHTML =
        '<p>피드를 불러오는 중 오류가 발생했다.</p>';
    }
  }

  // 2) 피드 렌더링
  function renderFeed(logs) {
    if (!logs || logs.length === 0) {
      feedContainer.innerHTML =
        '<p class="mlog-feed-empty">아직 이웃 새글이 없다.</p>';
      return;
    }

    const html = logs
      .map((log) => {
        const user = log.userId || {};
        const username = user.nickname || user.username || '알 수 없는 사용자';
        const userId = user._id;
        const created = log.createdAt
          ? new Date(log.createdAt).toLocaleString('ko-KR')
          : '';

        const track = log.track || {};
        const trackName = track.name || '';
        const artist = track.artist || '';
        const album = track.album || '';
        const spotifyUrl = track.spotifyUrl || '';
        const coverUrl = track.albumCover || '';

        // 아바타용 이니셜
        const initial = username ? username.trim().charAt(0) : '?';

        // 오른쪽 음악 카드 HTML (트랙이 있을 때만)
        const musicCardHtml = trackName
          ? `
            <div class="mlog-music-card">
              <div class="mlog-music-cover">
                ${
                  coverUrl
                    ? `<img src="${coverUrl}" alt="${escapeHtml(trackName)} 커버">`
                    : ''
                }
              </div>
              <div class="mlog-music-meta">
                <div class="mlog-music-title">${escapeHtml(trackName)}</div>
                <div class="mlog-music-artist">
                  ${escapeHtml(artist)}${
                    album ? ' · ' + escapeHtml(album) : ''
                  }
                </div>
              </div>
              ${
                spotifyUrl
                  ? `<button class="mlog-music-btn" data-spotify-url="${spotifyUrl}">
                       OPEN IN SPOTIFY
                     </button>`
                  : ''
              }
            </div>
          `
          : '';

        return `
          <article class="mlog-post">
            <!-- 왼쪽: 글 -->
            <div class="mlog-post-left">
              <div class="mlog-post-top mlog-post-author" data-user-id="${
                userId || ''
              }">
                <div class="mlog-avatar">${escapeHtml(initial)}</div>
                <div class="mlog-top-text">
                  <button type="button" class="mlog-post-username-btn">
                    ${escapeHtml(username)}
                  </button>
                  <div class="mlog-post-date">${escapeHtml(created)}</div>
                </div>
              </div>

              <div class="mlog-post-body">
                <p class="mlog-post-content">
                  ${escapeHtml(log.content || '')}
                </p>
              </div>
            </div>

            <!-- 오른쪽: 음악 카드 -->
            <div class="mlog-post-right">
              ${musicCardHtml}
            </div>
          </article>
        `;
      })
      .join('');

    feedContainer.innerHTML = html;

    // 작성자 이름 클릭 → 해당 MYLOG로
    const authorBlocks = feedContainer.querySelectorAll('.mlog-post-author');
    authorBlocks.forEach((block) => {
      const uid = block.getAttribute('data-user-id');
      if (!uid) return;
      const btn = block.querySelector('.mlog-post-username-btn');
      if (!btn) return;
      btn.addEventListener('click', () => {
        window.location.href = '/mylog/' + uid;
      });
    });

    // 음악 카드 안의 버튼 클릭 → 새 창으로 Spotify 이동
    const musicButtons = feedContainer.querySelectorAll('.mlog-music-btn');
    musicButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-spotify-url');
        if (!url) return;
        window.open(url, '_blank', 'noreferrer');
      });
    });
  }

  // 3) 간단 XSS 방지
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 4) 내 프로필 클릭 → 내 MYLOG로
  if (myProfileEl) {
    myProfileEl.addEventListener('click', () => {
      const myId = myProfileEl.getAttribute('data-user-id');
      if (!myId) return;
      window.location.href = '/mylog/' + myId;
    });
  }

  // 5) 친구 목록 클릭 → 친구 MYLOG로
  friendItems.forEach((item) => {
    item.addEventListener('click', () => {
      const friendId = item.getAttribute('data-user-id');
      if (!friendId) return;
      window.location.href = '/mylog/' + friendId;
    });
  });
});
