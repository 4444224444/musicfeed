(function () {
  const listEl = document.getElementById('playlist-list');

  // 생성용 바텀시트 / 오버레이
  const openModalBtn = document.getElementById('open-create-modal');
  const sheet = document.getElementById('pl-create-sheet');
  const overlay = document.getElementById('pl-sheet-overlay');

  // 바텀시트 내부 요소들
  const sheetForm = document.getElementById('playlist-modal-form');
  const imgBox = document.getElementById('pl-image-box');
  const nameInput = document.getElementById('pl-name-modal');
  const genreSelect = document.getElementById('pl-genre-modal');
  const cancelBtn = document.getElementById('pl-cancel-btn');
  const msgEl = document.getElementById('pl-message');

  // 상세 모달
  const detailModal = document.getElementById('pl-detail-modal');
  const detailTitle = document.getElementById('pl-detail-title');
  const detailMeta = document.getElementById('pl-detail-meta');
  const detailTracks = document.getElementById('pl-detail-tracks');
  const detailCloseBtn = document.getElementById('pl-detail-close');

  let uploadedImageDataUrl = ''; // base64 저장용

  // ======================
  // 공통 fetch 헬퍼
  // ======================
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

  // ======================
  // 바텀 시트 열기 / 닫기
  // ======================
  function openSheet() {
    msgEl.textContent = '';
    msgEl.className = 'pl-msg';
    sheet.classList.add('open');
    overlay.classList.add('open');
  }

  function closeSheet() {
    sheet.classList.remove('open');
    if (!detailModal.classList.contains('open')) {
      overlay.classList.remove('open');
    }

    sheetForm.reset();
    uploadedImageDataUrl = '';

    imgBox.classList.remove('has-image');
    imgBox.innerHTML = `
      <span class="pl-image-plus">+</span>
      <span class="pl-image-text">커버 이미지 추가</span>
      <input type="file" accept="image/*" hidden />
    `;

    const newInput = imgBox.querySelector('input[type="file"]');
    newInput.addEventListener('change', handleImageChange);
  }

  // ======================
  // 상세 모달 열기 / 닫기
  // ======================
function openDetailModal(pl) {
  const title = pl.title || pl.name || '플레이리스트';
  const genre = pl.genre || '';
  const trackCount = pl.tracks ? pl.tracks.length : 0;

  // 🔵 커버 엘리먼트 가져오기
  const coverEl = document.getElementById('pl-detail-cover');

  // 🔵 커버 이미지 URL 추출
  const cover =
    pl.coverImage ||
    pl.imageUrl ||
    (pl.tracks && pl.tracks[0] && pl.tracks[0].albumCover) ||
    '';

  if (coverEl) {
    if (cover) {
      coverEl.src = cover;
      coverEl.style.display = 'block';
    } else {
      // 커버 없으면 안 보이게
      coverEl.style.display = 'none';
    }
  }

  detailTitle.textContent = title;
  detailMeta.textContent = [
    genre ? `장르: ${genre}` : '',
    trackCount ? `트랙 ${trackCount}곡` : '',
  ]
    .filter(Boolean)
    .join(' · ');

if (pl.tracks && pl.tracks.length) {
  detailTracks.innerHTML = pl.tracks
    .map((t, i) => {
      const cover =
        t.albumCover || t.coverImage || ''; // 우리가 저장해 둔 필드

      return `
        <li class="pl-detail-track">
          <span class="track-index">${i + 1}.</span>

          ${
            cover
              ? `<img class="track-cover" src="${cover}" alt="${t.name} cover" />`
              : `<div class="track-cover track-cover-placeholder"></div>`
          }

          <div class="track-text">
            <span class="track-title">${t.name}</span>
            <span class="track-artist">${t.artist}</span>
          </div>
        </li>
      `;
    })
    .join('');
} else {
  detailTracks.innerHTML =
    '<li class="empty">트랙 정보가 없습니다.</li>';
}

  detailModal.classList.add('open');
  overlay.classList.add('open');
}


  function closeDetailModal() {
    detailModal.classList.remove('open');
    if (!sheet.classList.contains('open')) {
      overlay.classList.remove('open');
    }
  }

  // ======================
  // 이미지 선택 / 프리뷰
  // ======================
  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      alert('이미지 용량이 너무 커. 2MB 이하 이미지를 사용해 줘.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (ev) {
      uploadedImageDataUrl = ev.target.result;
      imgBox.classList.add('has-image');
      imgBox.innerHTML = `<img src="${uploadedImageDataUrl}" alt="playlist cover" />`;
    };
    reader.readAsDataURL(file);
  }

  // ======================
  // 이벤트 바인딩
  // ======================
  openModalBtn?.addEventListener('click', openSheet);
  cancelBtn?.addEventListener('click', closeSheet);

  overlay?.addEventListener('click', () => {
    closeSheet();
    closeDetailModal();
  });

  detailCloseBtn?.addEventListener('click', closeDetailModal);

  imgBox?.addEventListener('click', () => {
    const input = imgBox.querySelector('input[type="file"]');
    input && input.click();
  });

  const firstInput = imgBox.querySelector('input[type="file"]');
  firstInput && firstInput.addEventListener('change', handleImageChange);

  // ======================
  // 리스트 렌더링
  // ======================
function renderPlaylists(playlists) {
  if (!playlists || !playlists.length) {
    listEl.innerHTML =
      '<p class="muted">아직 생성한 플레이리스트가 없습니다. 하나 만들어볼까?</p>';
    return;
  }

  let html = '';
  playlists.forEach((pl) => {
    const title = pl.title || pl.name || '제목 없음';
    const genre = pl.genre || '';

    // 🔵 1순위: 저장한 coverImage
    // 🔵 2순위: 첫 트랙 앨범커버
    const cover =
      pl.coverImage ||
      (pl.tracks && pl.tracks[0] && pl.tracks[0].albumCover) ||
      '';

    const trackCount = pl.trackCount || (pl.tracks ? pl.tracks.length : 0);

    html += `
      <article class="pl-card" data-id="${pl._id}">
        <div class="pl-card-thumb" data-action="detail">
          ${
            cover
              ? `<img src="${cover}" alt="${title} cover" />`
              : ''
          }
        </div>
        <div class="pl-card-body">
          <div>
            <p class="pl-card-title">${title}</p>
            <p class="pl-card-genre">
              ${genre ? genre : ''}${trackCount ? ` · ${trackCount}곡` : ''}
            </p>
          </div>
          <div class="pl-card-actions">
            <button class="pl-push-btn" data-action="push">
              Push &lt;
            </button>
            ${
              pl.pushedToSpotify
                ? `<span class="pl-pushed-label">✅ pushed</span>`
                : ''
            }
          </div>
        </div>
      </article>
    `;
  });

  listEl.innerHTML = html;
}


  // ======================
  // 서버에서 목록 불러오기
  // ======================
  async function loadPlaylists() {
    try {
      const data = await jsonFetch('/api/playlists');
      renderPlaylists(data);
    } catch (e) {
      console.error(e);
      listEl.innerHTML =
        '<p class="error">플레이리스트를 불러오는 중 오류가 발생했다.</p>';
    }
  }

  // ======================
  // 생성 폼 submit (바텀시트)
  // ======================
sheetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  msgEl.textContent = '';
  msgEl.className = 'pl-msg';

  const name = nameInput.value.trim();
  const genre = genreSelect.value.trim();

  try {
      if (!name) {
        throw new Error('플레이리스트 제목을 입력해 주세요.');
      }
      if (!genre) {
        throw new Error('장르를 선택해 주세요.');
      }

      await jsonFetch('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({
          name,
          genre,
          coverImage: uploadedImageDataUrl || null,   // ← 여기!!!
        }),
      });

      msgEl.textContent = '플레이리스트가 생성되었습니다.';
      msgEl.classList.add('success');

      setTimeout(() => {
        closeSheet();
        loadPlaylists();
      }, 400);
    } catch (err) {
      console.error(err);
      msgEl.textContent = err.message || '생성 중 오류가 발생했습니다.';
      msgEl.classList.add('error');
    }
});


  // ======================
  // 카드 클릭 (상세 / PUSH)
  // ======================
  listEl.addEventListener('click', async (e) => {
    const card = e.target.closest('.pl-card');
    if (!card) return;

    const id = card.dataset.id;
    const btn = e.target.closest('button');
    const action = btn?.dataset.action || e.target.dataset.action;

    // 1) push 버튼 클릭
    if (action === 'push') {
      const pushBtn = btn;
      if (!pushBtn) return;

      pushBtn.disabled = true;
      const originalText = pushBtn.textContent;
      pushBtn.textContent = '전송 중...';

      try {
        const result = await jsonFetch(`/api/playlists/${id}/push`, {
          method: 'POST',
        });

        alert(
          'Spotify에 플레이리스트가 생성됐다.\n\n' +
            (result.spotifyPlaylistUrl || '')
        );
        loadPlaylists();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Spotify 전송 중 오류 발생');
      } finally {
        pushBtn.disabled = false;
        pushBtn.textContent = originalText;
      }
      return;
    }

    // 2) 나머지 클릭 → 상세 모달
    try {
      const pl = await jsonFetch(`/api/playlists/${id}`);
      openDetailModal(pl);
    } catch (err) {
      console.error(err);
      alert('상세 정보를 불러오는 중 오류가 발생했다.');
    }
  });

  // 초기 로드
  loadPlaylists();
})();
