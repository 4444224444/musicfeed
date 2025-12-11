(function () {
  const listEl = document.getElementById('list');
  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('count');
  const refreshBtn = document.getElementById('refreshBtn');

  const tabMe = document.getElementById('tabMe');
  const tabFriends = document.getElementById('tabFriends');

  if (!listEl) return; // 비로그인 상태면 바로 종료

  let myItems = [];
  let friendItems = [];
  let currentTab = 'me';

  function timeAgo(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}초 전`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    return `${day}일 전`;
  }

  function msToMinSec(ms) {
    if (!ms) return '';
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  // ===== 가로 갤러리 드래그 스크롤 세팅 =====
  function setupDragScroll() {
    const slider = listEl;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let moved = false; // 드래그로 움직였는지 여부

    slider.onmousedown = (e) => {
      isDown = true;
      moved = false;
      slider.classList.add('dragging');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    slider.onmouseleave = () => {
      isDown = false;
      slider.classList.remove('dragging');
    };

    slider.onmouseup = () => {
      isDown = false;
      setTimeout(() => {
        moved = false;
      }, 50);
      slider.classList.remove('dragging');
    };

    slider.onmousemove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5; // 속도 조절
      if (Math.abs(walk) > 5) moved = true;
      slider.scrollLeft = scrollLeft - walk;
    };

    // 터치 지원
    slider.ontouchstart = (e) => {
      isDown = true;
      moved = false;
      slider.classList.add('dragging');
      startX = e.touches[0].pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    slider.ontouchend = () => {
      isDown = false;
      setTimeout(() => {
        moved = false;
      }, 50);
      slider.classList.remove('dragging');
    };

    slider.ontouchmove = (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) moved = true;
      slider.scrollLeft = scrollLeft - walk;
    };

    // 드래그 중에는 카드/링크 클릭 막기
    slider.onclick = (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  }

  // ========================
  // 렌더: 내 기록 (카드)
  // ========================
  function renderMy(items) {
    if (!items || !items.length) {
      listEl.innerHTML = `
        <li class="empty muted">
          내 최근 재생 내역이 비어있다.
        </li>`;
      countEl.textContent = '';
      return;
    }

    const html = items
      .map((it) => {
        const track = it.track || it.item || it;
        const name = track.name || '';
        const artists = Array.isArray(track.artists)
          ? track.artists.map((a) => a.name).join(', ')
          : '';
        const cover =
          track.album?.images?.[1]?.url ||
          track.album?.images?.[0]?.url ||
          '';
        const playedAt =
          it.played_at || it.playedAt || it.timestamp || track.played_at;
        const duration = track.duration_ms ? msToMinSec(track.duration_ms) : '';
        const externalUrl =
          track.external_urls?.spotify ||
          (track.id ? `https://open.spotify.com/track/${track.id}` : '#');

        return `
          <li class="recent-item">
            <div class="recent-card">
              <div class="recent-cover">
                ${
                  cover
                    ? `<img src="${cover}" alt="${name} 앨범 커버">`
                    : ''
                }
              </div>
              <div class="recent-body">
                <div class="recent-track-name">${name}</div>
                <div class="recent-artist-name">${artists}</div>
              </div>
            </div>
            <a 
              class="recent-open"
              href="${externalUrl}"
              target="_blank"
              rel="noopener noreferrer"
            >
              OPEN IN SPOTIFY &rarr;
            </a>
          </li>
        `;
      })
      .join('');

    listEl.innerHTML = html;
    countEl.textContent = `${items.length}곡`;

    setupDragScroll();
  }

  // ========================
  // 렌더: 친구들 기록 (카드)
  // ========================
  function renderFriends(items) {
    if (!items || !items.length) {
      listEl.innerHTML = `
        <li class="empty muted">
          친구들의 최근 재생 기록이 없다.
        </li>`;
      countEl.textContent = '';
      return;
    }

    const html = items
      .map((it) => {
        const track = it.track || {};
        const name = track.name || '';
        const artists =
          track.artist ||
          (Array.isArray(track.artists)
            ? track.artists.map((a) => a.name).join(', ')
            : '');
        const cover =
          track.albumCover ||
          track.album?.images?.[0]?.url ||
          '';
        const playedAt = it.played_at;
        const duration = track.duration_ms ? msToMinSec(track.duration_ms) : '';
        const externalUrl =
          track.spotifyUrl ||
          track.external_urls?.spotify ||
          (track.id ? `https://open.spotify.com/track/${track.id}` : '#');
        const friendName = it.friend?.username || '친구';

        return `
          <li class="recent-item">
            <div class="recent-card">
              <div class="recent-cover">
                ${
                  cover
                    ? `<img src="${cover}" alt="${name} 앨범 커버">`
                    : ''
                }
              </div>
              <div class="recent-body">
                <div class="recent-track-name">${name}</div>
                <div class="recent-artist-name">${artists} · ${friendName}</div>
              </div>
            </div>
            <a 
              class="recent-open"
              href="${externalUrl}"
              target="_blank"
              rel="noopener noreferrer"
            >
              OPEN IN SPOTIFY &rarr;
            </a>
          </li>
        `;
      })
      .join('');

    listEl.innerHTML = html;
    countEl.textContent = `${items.length}곡`;

    setupDragScroll();
  }

  function renderCurrent() {
    if (currentTab === 'me') {
      renderMy(myItems);
    } else {
      renderFriends(friendItems);
    }
  }

  async function loadAll() {
    statusEl.textContent = '불러오는 중…';
    listEl.innerHTML = '';
    countEl.textContent = '';

    try {
      const [myRes, friendRes] = await Promise.all([
        fetch('/api/spotify/recent', { credentials: 'include' }),
        fetch('/api/feed', { credentials: 'include' }),
      ]);

      if (myRes.status === 401 || friendRes.status === 401) {
        statusEl.innerHTML = `로그인이 필요하다. <a href="/login">로그인</a>`;
        return;
      }

      const myData = await myRes.json();
      const friendData = await friendRes.json();

      myItems = Array.isArray(myData) ? myData : myData.items || [];

      myItems = myItems.sort(
        (a, b) =>
          new Date(b.played_at || b.playedAt || 0) -
          new Date(a.played_at || a.playedAt || 0)
      );

      friendItems = Array.isArray(friendData) ? friendData : [];

      friendItems = friendItems.sort(
        (a, b) => new Date(b.played_at || 0) - new Date(a.played_at || 0)
      );

      renderCurrent();
      statusEl.textContent = '완료';
      setTimeout(() => (statusEl.textContent = ''), 800);
    } catch (e) {
      console.error(e);
      statusEl.innerHTML = '불러오는 중 오류가 발생했다.';
      listEl.innerHTML = `
        <li class="empty muted">잠시 후 다시 시도해 달라.</li>
      `;
    }
  }

  // 탭 버튼 이벤트
  tabMe?.addEventListener('click', () => {
    currentTab = 'me';
    tabMe.classList.add('active');
    tabFriends.classList.remove('active');
    renderCurrent();
  });

  tabFriends?.addEventListener('click', () => {
    currentTab = 'friends';
    tabFriends.classList.add('active');
    tabMe.classList.remove('active');
    renderCurrent();
  });

  // 새로고침 버튼 → 둘 다 다시 요청
  refreshBtn?.addEventListener('click', loadAll);

  // 진입 즉시 로드
  loadAll();
})();
