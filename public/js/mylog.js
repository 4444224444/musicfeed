// public/js/mylog.js
(function () {
  // 🔹 1) 루트 엘리먼트에서 EJS가 심어준 값 읽기
  const root = document.getElementById('mylogPage');
  if (!root) return; // 이 페이지가 아니면 아무 것도 안 함

  const viewedUserId = root.dataset.viewedUserId;
  const IS_ME = root.dataset.isMe === 'true';

  const mylogList = document.getElementById('mylogList');
  let logs = [];

  // ============ 공통 fetch 유틸 ============
  async function jsonFetch(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      const msg = data && data.message ? data.message : '요청 실패';
      throw new Error(msg);
    }
    return data;
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

  // ============ 날짜 포맷 ============
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ============ 로그 렌더 (목록 요약만) ============
  function renderLogs() {
    if (!mylogList) return;

    if (!logs.length) {
      mylogList.innerHTML =
        '<li class="muted empty">아직 남긴 기록이 없다.</li>';
      return;
    }

    // (선택) EJS에서 data-viewed-user-name을 심어뒀다면 그걸 기본 표시명으로 활용
    const viewedUserName =
      root.dataset.viewedUserName || root.dataset.viewedUserName === ''
        ? root.dataset.viewedUserName
        : '';

    const html = logs
      .map((log) => {
        const t = log.track || {};
        const date = formatDate(log.createdAt);

        // ✅ 작성자 표시명 (닉네임 우선, 없으면 username)
        const author =
          log.userId && typeof log.userId === 'object'
            ? (log.userId.nickname || log.userId.username || viewedUserName || '알 수 없음')
            : (viewedUserName || '알 수 없음');

        const title =
          log.title && log.title.trim()
            ? log.title
            : t.name || '제목 없음';

        const artist = t.artist || '';
        const trackLine = t.name
          ? `${t.name}${artist ? ' · ' + artist : ''}`
          : artist || '';

        return `
          <li class="mylog-item" data-id="${log._id}">
            <a href="/mylog/post/${log._id}" class="mylog-link">
              <div class="mylog-head">
                <div class="track-info">
                  <div>
                    <!-- ✅ 닉네임 표시 -->
                    <div class="writer muted">${escapeHtml(author)}</div>

                    <div class="title">${escapeHtml(title)}</div>
                    <div class="artist muted">${escapeHtml(trackLine)}</div>
                  </div>
                </div>
                <div class="meta muted">${escapeHtml(date)}</div>
              </div>
            </a>
          </li>
        `;
      })
      .join('');

    mylogList.innerHTML = html;
  }

  // ============ 로그 로드 ============
  async function loadLogs() {
    if (!mylogList) return;
    mylogList.innerHTML =
      '<li class="muted empty">기록을 불러오는 중이다...</li>';

    try {
      const data = await jsonFetch('/api/mylog/user/' + viewedUserId);
      logs = Array.isArray(data) ? data : [];
      renderLogs();
    } catch (err) {
      console.error(err);
      mylogList.innerHTML =
        '<li class="muted empty">기록을 불러오는 중 오류 발생.</li>';
    }
  }

  // ============ 내 페이지일 때만 동작하는 작성/검색 로직 ============
  let selectedTrack = null;

if (IS_ME) {
  const titleEl = document.getElementById('title');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const searchStatus = document.getElementById('searchStatus');
  const searchResultsEl = document.getElementById('searchResults');

  const selectedBox = document.getElementById('selectedTrackBox');
  const selCover = document.getElementById('selCover');
  const selTitle = document.getElementById('selTitle');
  const selArtist = document.getElementById('selArtist');

  const contentEl = document.getElementById('content');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  // 🔹 바텀시트 토글 요소
  const composePanel = document.getElementById('mylogCompose');
  const openComposeBtn = document.getElementById('openComposeBtn');
  const closeComposeBtn = document.getElementById('closeComposeBtn');

  if (composePanel && openComposeBtn) {
    openComposeBtn.addEventListener('click', () => {
      composePanel.classList.add('open');
    });
  }

  if (composePanel && closeComposeBtn) {
    closeComposeBtn.addEventListener('click', () => {
      composePanel.classList.remove('open');
    });
  }

  // ↓↓↓ 아래부터는 네가 이미 가진 검색/저장 로직 그대로 두면 됨

function renderSelectedTrack() {
  const selectedBox = document.getElementById('selectedTrackBox');
  const selCover = document.getElementById('selCover');
  const selTitle = document.getElementById('selTitle');
  const selArtist = document.getElementById('selArtist');

  if (!selectedTrack) {
    selectedBox.style.display = 'none';
    return;
  }

  // 트랙 정보 반영
  selCover.src = selectedTrack.albumCover || '';
  selTitle.textContent = selectedTrack.name || '';
  selArtist.textContent = selectedTrack.artist || '';

  selectedBox.style.display = 'block';
}


    function renderSearchResults(list) {
      if (!searchResultsEl) return;
      searchResultsEl.style.display = 'block';

      if (!list.length) {
        searchResultsEl.innerHTML =
          '<li class="muted no-result">검색 결과가 없다.</li>';
        return;
      }

      const html = list
        .map(
          (t) => `
            <li class="search-item" data-id="${t.id}">
              <img src="${t.albumCover || ''}" class="cover" />
              <div class="info">
                <div class="title">${t.name}</div>
                <div class="artist muted">${t.artist}</div>
              </div>
              <button class="btn small ghost" data-action="select">선택</button>
            </li>
          `
        )
        .join('');

      searchResultsEl.innerHTML = html;
    }

    async function doSearch() {
      if (!searchInput || !searchStatus || !searchResultsEl) return;

      const q = (searchInput.value || '').trim();
      searchStatus.textContent = '';
      searchResultsEl.innerHTML = '';

      if (!q) {
        searchStatus.textContent = '검색어를 입력해 달라.';
        return;
      }

      try {
        searchStatus.textContent = '검색 중…';
        const data = await jsonFetch(
          '/api/spotify/search?query=' + encodeURIComponent(q)
        );
        renderSearchResults(Array.isArray(data) ? data : []);
        searchStatus.textContent = '';
      } catch (err) {
        console.error(err);
        searchStatus.textContent = err.message || '검색 중 오류 발생.';
      }
    }

    searchBtn && searchBtn.addEventListener('click', doSearch);
    searchInput &&
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSearch();
        }
      });

    searchResultsEl &&
      searchResultsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="select"]');
        if (!btn) return;
        const item = btn.closest('.search-item');
        if (!item) return;

        const id = item.dataset.id;
        const title =
          item.querySelector('.title')?.textContent || '';
        const artist =
          item
            .querySelector('.artist')
            ?.textContent.replace('·', '')
            .trim() || '';
        const img = item.querySelector('img.cover')?.src || '';

        selectedTrack = {
          id,
          name: title,
          artist,
          album: '',
          albumCover: img,
          spotifyUrl: '',
        };

        renderSelectedTrack();

        searchInput.value = '';
        searchResultsEl.innerHTML = '';
        searchResultsEl.style.display = 'none';
        searchStatus.textContent = '곡이 선택되었다.';

        contentEl && contentEl.focus();
      });

    async function saveLog() {
      if (!contentEl || !saveStatus || !saveBtn) return;
      saveStatus.textContent = '';

      const text = (contentEl.value || '').trim();
      const title = (titleEl?.value || '').trim();

      if (!selectedTrack) {
        saveStatus.textContent = '먼저 곡을 선택해 달라.';
        return;
      }
      if (!text) {
        saveStatus.textContent = '감상을 적어 달라.';
        return;
      }

      try {
        saveBtn.disabled = true;
        saveStatus.textContent = '저장 중…';

        const body = {
          title,
          content: text,
          track: selectedTrack,
        };

        saveStatus.textContent = '저장 완료.';
        setTimeout(() => (saveStatus.textContent = ''), 1000);

        // 저장 후 시트 닫기
        if (composePanel) composePanel.classList.remove('open');


        const created = await jsonFetch('/api/mylog', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        logs.unshift(created);
        renderLogs();

        contentEl.value = '';
        if (titleEl) titleEl.value = '';
        selectedTrack = null;
        renderSelectedTrack();

        if (searchResultsEl) {
          searchResultsEl.innerHTML = '';
          searchResultsEl.style.display = 'none';
        }
        if (searchStatus) searchStatus.textContent = '';

        saveStatus.textContent = '저장 완료.';
        setTimeout(() => (saveStatus.textContent = ''), 1000);
      } catch (err) {
        console.error(err);
        saveStatus.textContent = err.message || '저장 중 오류 발생.';
      } finally {
        saveBtn.disabled = false;
      }
    }

    saveBtn && saveBtn.addEventListener('click', saveLog);
  }

  // ✅ 초기 로드
  loadLogs();
})();
