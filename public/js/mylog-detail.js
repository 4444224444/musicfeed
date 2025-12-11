  (function () {
    // 1) 루트 엘리먼트에서 data-* 읽기
  const root = document.getElementById('mylogDetailPage');
  if (!root) return;

    const postId = root.dataset.postId;      // EJS가 HTML에 박아준 값
    const myUserId = root.dataset.myUserId;  // 로그인한 내 아이디

    const headerEl = document.getElementById('postHeader');
    const bodyEl = document.getElementById('postBody');
    const actionsEl = document.getElementById('postActions');
    const commentList = document.getElementById('commentList');
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');

    let postData = null;

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

    async function loadPost() {
      try {
        const data = await jsonFetch('/api/mylog/post/' + postId);
        postData = data;
        renderPost();
        renderComments();
      } catch (err) {
        console.error(err);
        headerEl.innerHTML = '<p>글을 불러오는 중 오류 발생.</p>';
      }
    }

    function renderPost() {
      if (!postData) return;
      const user = postData.userId || {};
      const t = postData.track || {};
      const isMe = String(user._id) === String(myUserId);

      const title =
        postData.title && postData.title.trim()
          ? postData.title
          : (t.name || '제목 없음');

      headerEl.innerHTML = `
        <h1>${escapeHtml(title)}</h1>
        <p>작성자: ${escapeHtml(user.username || '')}</p>
        <p>작성일: ${escapeHtml(formatDate(postData.createdAt))}</p>
        <p>곡: ${escapeHtml(t.name || '')}${
        t.artist ? ' · ' + escapeHtml(t.artist) : ''
      }</p>
      `;

      bodyEl.innerHTML = `
        <p>${escapeHtml(postData.content || '')}</p>
      `;

      if (isMe) {
        actionsEl.innerHTML = `
          <button id="editBtn" type="button">편집</button>
          <button id="deleteBtn" type="button">삭제</button>
        `;
        attachEditDeleteHandlers();
      } else {
        actionsEl.innerHTML = '';
      }
    }

    function renderComments() {
      if (!postData) return;
      const comments = postData.comments || [];

      if (!comments.length) {
        commentList.innerHTML =
          '<li class="muted">아직 댓글이 없다.</li>';
        return;
      }

      const html = comments
        .map((c) => {
          const isMine =
            c.userId && String(c.userId._id) === String(myUserId);
          return `
            <li data-comment-id="${c._id}">
              <div>
                <strong>${escapeHtml(c.userId?.username || '')}</strong>
                <span> (${escapeHtml(formatDate(c.createdAt))})</span>
              </div>
              <p>${escapeHtml(c.content || '')}</p>
              ${
                isMine
                  ? '<button type="button" data-action="delete-comment">댓글 삭제</button>'
                  : ''
              }
            </li>
          `;
        })
        .join('');

      commentList.innerHTML = html;
    }

    function attachEditDeleteHandlers() {
      const editBtn = document.getElementById('editBtn');
      const deleteBtn = document.getElementById('deleteBtn');

      if (editBtn) editBtn.addEventListener('click', onEdit);
      if (deleteBtn) deleteBtn.addEventListener('click', onDelete);
    }

    function onEdit() {
      if (!postData) return;

      const current = postData.content || '';

      bodyEl.innerHTML = `
        <textarea id="editContent" rows="6">${escapeHtml(
          current
        )}</textarea>
        <button id="editSaveBtn" type="button">저장</button>
        <button id="editCancelBtn" type="button">취소</button>
      `;

      const saveBtn = document.getElementById('editSaveBtn');
      const cancelBtn = document.getElementById('editCancelBtn');
      const editContent = document.getElementById('editContent');

      saveBtn.addEventListener('click', async () => {
        const newText = (editContent.value || '').trim();
        if (!newText) {
          alert('내용을 비워둘 수 없다.');
          return;
        }
        try {
          await jsonFetch('/api/mylog/' + postId, {
            method: 'PUT',
            body: JSON.stringify({ content: newText }),
          });
          postData.content = newText;
          renderPost();
        } catch (err) {
          console.error(err);
          alert(err.message || '수정 중 오류 발생.');
        }
      });

      cancelBtn.addEventListener('click', () => {
        renderPost();
      });
    }

    async function onDelete() {
      if (!confirm('정말 이 글을 삭제할까?')) return;
      try {
        await jsonFetch('/api/mylog/' + postId, {
          method: 'DELETE',
        });
        alert('삭제 완료.');
        window.location.href = '/m-log';
      } catch (err) {
        console.error(err);
        alert(err.message || '삭제 중 오류 발생.');
      }
    }

    // 댓글 폼
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (commentInput.value || '').trim();
      if (!text) return;

      try {
        const newComment = await jsonFetch(
          '/api/mylog/' + postId + '/comments',
          {
            method: 'POST',
            body: JSON.stringify({ content: text }),
          }
        );

        postData.comments = postData.comments || [];
        postData.comments.push(newComment);
        commentInput.value = '';
        renderComments();
      } catch (err) {
        console.error(err);
        alert(err.message || '댓글 등록 중 오류 발생.');
      }
    });

    // 댓글 삭제
    commentList.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action="delete-comment"]');
      if (!btn) return;

      const li = btn.closest('li[data-comment-id]');
      if (!li) return;

      const commentId = li.getAttribute('data-comment-id');
      if (!confirm('댓글을 삭제할까?')) return;

      try {
        await jsonFetch('/api/mylog/comments/' + commentId, {
          method: 'DELETE',
        });
        postData.comments = postData.comments.filter(
          (c) => String(c._id) !== String(commentId)
        );
        renderComments();
      } catch (err) {
        console.error(err);
        alert(err.message || '댓글 삭제 중 오류 발생.');
      }
    });

    // 초기 로드
    loadPost();
  })();