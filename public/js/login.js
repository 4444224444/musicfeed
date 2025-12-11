    const form = document.getElementById('local-login-form');
    const errorMessage = document.getElementById('login-error-message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (errorMessage) errorMessage.textContent = '';
        
        const username = form.username.value;
        const password = form.password.value;

        try {
            const res = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (errorMessage) {
                    errorMessage.textContent =
                        data.message || '로그인에 실패했다. ID와 비밀번호를 확인해라.';
                }
                return;
            }

            window.location.href = '/';

        } catch (error) {
            if (errorMessage) {
                errorMessage.textContent = '서버 통신 중 오류가 발생했다.';
            }
            console.error(error);
        }
    });