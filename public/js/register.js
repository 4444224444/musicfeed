const form = document.getElementById('local-register-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = '';

    const username = form.username.value.trim();
    const password = form.password.value.trim();
    const nickname = form.nickname.value.trim();

    if (!username || !password || !nickname) {
        errorMessage.textContent = '아이디, 비밀번호, 닉네임을 모두 입력하세요.';
        return;
    }

    try {
        const res = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, nickname }),
        });

        const data = await res.json();

        if (!res.ok) {
            errorMessage.textContent = data.message || '회원가입 실패';
            return;
        }

        window.location.href = '/api/spotify/login';

    } catch (error) {
        errorMessage.textContent = '서버 통신 오류 발생';
        console.error(error);
    }
});
