document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('mylogDetailPage');
  if (!root) return;

  const postId = root.dataset.postId;
  const myUserId = root.dataset.myUserId || '';

  const postHeader = document.getElementById('postHeader');
  const postBody = document.getElementById('postBody');
  const postActions = document.getElementById('postActions');

  const openCommentsBtn = document.getElementById('openCommentsBtn');
  const actionMsg = document.getElementById('actionMsg');

  const overlay = document.getElementById('commentOverlay');
  const sheet = document.getElementById('commentSheet');
  const closeCommentsBtn = document.getElementById('closeCommentsBtn');

  const commentList = document.getElementById('commentList');
  const commentForm = document.getElementById('commentForm');
  const commentInput = document.getElementById('commentInput');
  const commentMsg = document.getElementById('commentMsg');

  // ✅ 글 상세는 /post/:id 그대로 OK
  const POST_URL = `/api/mylog/post/${postId}`;

  // ✅ 댓글은 /:id/comments 가 맞다 (404 해결 포인트)
  const COMMENTS_URL = `/api/mylog/${postId}/comments`;

  let cachedPost = null;

  init();

  async function init() {
    await loadPost();
    bindSheet();
  }

  function bindSheet() {
    if (openCommentsBtn) {
      openCommentsBtn.addEventListener('click', async () => {
        openSheet();
        await loadComments();
      });
    }

    if (overlay) overlay.addEventListener('click', closeSheet);
    if (closeCommentsBtn) closeCommentsBtn.addEventListener('click', closeSheet);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheet();
    });

    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitComment();
      });
    }
  }

  function openSheet() {
    overlay && overlay.classList.add('open');
    sheet && sheet.classList.add('open');
    sheet && sheet.setAttribute('aria-hidden', 'false');
    setTimeout(() => commentInput && commentInput.focus(), 50);
  }

  function closeSheet() {
    overlay && overlay.classList.remove('open');
    sheet && sheet.classList.remove('open');
    sheet && sheet.setAttribute('aria-hidden', 'true');
    commentMsg && (commentMsg.textContent = '');
  }

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

  async function loadPost() {
    if (!postHeader || !postBody) return;

    postHeader.innerHTML = '';
    postBody.innerHTML = '';

    try {
      const post = await jsonFetch(POST_URL);
      cachedPost = post;
      renderPost(post);
    } catch (e) {
      postHeader.innerHTML = `<p class="muted">불러올 수 없다.</p>`;
      postBody.innerHTML = '';
    }
  }

  function renderPost(post) {
    const user = post.userId || {};
    const displayName = user.nickname || user.username || '알 수 없음';
    const created = post.createdAt ? formatDateFull(post.createdAt) : '';

    const initial = displayName.trim() ? displayName.trim().charAt(0) : '?';

    const t = post.track || {};
    const trackName = t.name || '';
    const artist = t.artist || '';
    const album = t.album || '';
    const coverUrl = t.albumCover || '';
    const spotifyUrl = t.spotifyUrl || '';

    const title = (post.title || '').trim();
    const subLine = trackName
      ? `${trackName}${artist ? ' · ' + artist : ''}${album ? ' · ' + album : ''}`
      : '';

    postHeader.innerHTML = `
      <div class="post-topline">
        <div class="post-author">
          <div class="post-avatar">${escapeHtml(initial)}</div>
          <div class="post-author-meta">
            <div class="post-author-name">${escapeHtml(displayName)}</div>
            <div class="post-date">${escapeHtml(created)}</div>
          </div>
        </div>
      </div>
      <h1 class="post-title">${escapeHtml(title || '기록')}</h1>
      ${subLine ? `<p class="post-sub">${escapeHtml(subLine)}</p>` : `<p class="post-sub"></p>`}
    `;

    const musicHtml = trackName
      ? `
        <aside class="post-music">
          <div class="post-cover">
            ${coverUrl ? `<img src="${coverUrl}" alt="${escapeHtml(trackName)}">` : ``}
          </div>
          <div class="post-track">
            <div class="post-track-name">${escapeHtml(trackName)}</div>
            <div class="post-track-artist">${escapeHtml(artist || album || '')}</div>
          </div>
          ${spotifyUrl ? `<button type="button" class="post-spotify-btn" data-url="${spotifyUrl}">Spotify</button>` : ``}
        </aside>
      `
      : ``;

    postBody.innerHTML = `
      <div class="post-card">
        <p class="post-content">${escapeHtml(post.content || '')}</p>
        ${musicHtml || `<div></div>`}
      </div>
    `;

    const spotifyBtn = postBody.querySelector('.post-spotify-btn');
    if (spotifyBtn) {
      spotifyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = spotifyBtn.dataset.url;
        if (url) window.open(url, '_blank', 'noreferrer');
      });
    }

    if (postActions && cachedPost?.userId?._id) {
      const isMine = String(cachedPost.userId._id) === String(myUserId);
      if (isMine) actionMsg && (actionMsg.textContent = '');
    }
  }

  async function loadComments() {
    if (!commentList) return;
    commentList.innerHTML = `<li class="muted">불러오는 중...</li>`;
    commentMsg && (commentMsg.textContent = '');

    try {
      const data = await jsonFetch(COMMENTS_URL);
      const list = Array.isArray(data) ? data : [];
      renderComments(list);
    } catch (e) {
      commentList.innerHTML = `<li class="muted">불러올 수 없다.</li>`;
    }
  }

  function renderComments(list) {
    if (!list.length) {
      commentList.innerHTML = `<li class="muted">댓글이 없다.</li>`;
      return;
    }

    commentList.innerHTML = list
      .map((c) => {
        const u = c.userId || {};
        const name = u.nickname || u.username || '알 수 없음';
        const time = c.createdAt ? formatDateMini(c.createdAt) : '';
        const text = c.content || c.text || '';

        return `
          <li class="comment-item">
            <div class="comment-meta">
              <div class="comment-writer">${escapeHtml(name)}</div>
              <div class="comment-time">${escapeHtml(time)}</div>
            </div>
            <p class="comment-text">${escapeHtml(text)}</p>
          </li>
        `;
      })
      .join('');
  }

  async function submitComment() {
    if (!commentInput || !commentMsg) return;

    const text = (commentInput.value || '').trim();
    if (!text) {
      commentMsg.textContent = '내용을 입력해 달라.';
      return;
    }

    try {
      commentMsg.textContent = '등록 중...';

      await jsonFetch(COMMENTS_URL, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });

      commentInput.value = '';
      commentMsg.textContent = '등록 완료.';
      setTimeout(() => (commentMsg.textContent = ''), 800);

      await loadComments();
    } catch (e) {
      commentMsg.textContent = e.message || '등록 실패';
    }
  }

  function formatDateFull(iso) {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDateMini(iso) {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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
});
