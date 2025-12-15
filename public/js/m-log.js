document.addEventListener('DOMContentLoaded', () => {
  const feedContainer = document.getElementById('mlog-feed');
  const myProfileEl = document.getElementById('mlog-my-profile');
  const friendItems = document.querySelectorAll('.mlog-friend-item');

  loadFeed();

  async function loadFeed() {
    if (!feedContainer) return;

    feedContainer.innerHTML =
      '<p class="mlog-feed-loading">불러오는 중...</p>';

    try {
      const res = await fetch('/api/mylog/feed', {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('feed error');

      const logs = await res.json();
      renderFeed(logs);
    } catch (e) {
      console.error(e);
      feedContainer.innerHTML =
        '<p class="mlog-feed-empty">불러올 수 없다.</p>';
    }
  }

  function renderFeed(logs) {
    if (!logs || logs.length === 0) {
      feedContainer.innerHTML =
        '<p class="mlog-feed-empty">새 글이 없다.</p>';
      return;
    }

    feedContainer.innerHTML = logs
      .map((log) => {
        const user = log.userId || {};
        const username = user.username || '알 수 없음';
        const userId = user._id || '';

        const created = log.createdAt
          ? new Date(log.createdAt).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        const content = log.content || '';

        const track = log.track || {};
        const trackName = track.name || '';
        const artist = track.artist || '';
        const album = track.album || '';
        const coverUrl = track.albumCover || '';
        const spotifyUrl = track.spotifyUrl || '';

        const initial = username.trim().charAt(0);

        const musicHtml = trackName
          ? `
            <div class="mlog-music">
              <div class="mlog-music-cover">
                ${
                  coverUrl
                    ? `<img src="${coverUrl}" alt="${escapeHtml(trackName)}">`
                    : ''
                }
              </div>

              <div class="mlog-music-title">
                ${escapeHtml(trackName)}
              </div>
              <div class="mlog-music-artist">
                ${escapeHtml(artist)}${
              album ? ' · ' + escapeHtml(album) : ''
            }
              </div>

              ${
                spotifyUrl
                  ? `<button class="mlog-music-btn" data-url="${spotifyUrl}">
                       Spotify
                     </button>`
                  : ''
              }
            </div>
          `
          : '';

        return `
          <article class="mlog-post">
            <!-- 작성자 -->
            <div class="mlog-post-top mlog-post-author" data-user-id="${userId}">
              <div class="mlog-avatar">${escapeHtml(initial)}</div>
              <div class="mlog-top-text">
                <button class="mlog-post-username-btn">
                  ${escapeHtml(username)}
                </button>
                <div class="mlog-post-date">${escapeHtml(created)}</div>
              </div>
            </div>

            <!-- 카드 -->
            <div class="mlog-post-card">
              <p class="mlog-post-content">
                ${escapeHtml(content)}
              </p>

              ${musicHtml}
            </div>
          </article>
        `;
      })
      .join('');

    bindEvents();
  }

  function bindEvents() {
    document
      .querySelectorAll('.mlog-post-author')
      .forEach((el) => {
        const uid = el.dataset.userId;
        if (!uid) return;

        el.addEventListener('click', () => {
          window.location.href = '/mylog/' + uid;
        });
      });

    document.querySelectorAll('.mlog-music-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        if (url) window.open(url, '_blank', 'noreferrer');
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (myProfileEl) {
    myProfileEl.addEventListener('click', () => {
      const myId = myProfileEl.dataset.userId;
      if (myId) window.location.href = '/mylog/' + myId;
    });
  }

  friendItems.forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.dataset.userId;
      if (id) window.location.href = '/mylog/' + id;
    });
  });
});
