    // 유틸리티 함수: API 호출 및 상태 메시지 업데이트
    async function handleApiCall(url, method, body, successMessage, statusElementId, redirectUrl = null) {
        const statusElement = document.getElementById(statusElementId);
        
        // 상태 요소가 없을 경우 경고 후 종료 (보안 문제 아님)
        if (!statusElement) {
            console.warn(`Status element not found: ${statusElementId}`);
            if (redirectUrl) window.location.href = redirectUrl;
            return false;
        }

        statusElement.textContent = '처리 중...';
        statusElement.style.color = '#FFB300'; // 처리 중 색상

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = await res.json();

            if (!res.ok) {
                statusElement.textContent = `오류: ${data.message || '요청에 실패했습니다.'}`;
                statusElement.style.color = '#A30000'; // 오류 색상
                return false;
            }

            statusElement.textContent = successMessage;
            statusElement.style.color = '#1DB954'; // 성공 색상
            
            if (redirectUrl) {
                setTimeout(() => { window.location.href = redirectUrl; }, 1000);
            }
            return true;

        } catch (e) {
            statusElement.textContent = '서버 통신 중 심각한 오류가 발생했습니다.';
            statusElement.style.color = '#A30000';
            console.error('API Call Failed:', e);
            return false;
        }
    }

    // 1. 사용자 이름 수정
    document.getElementById('update-username-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('username').value;
        
        if (!newUsername.trim()) {
            document.getElementById('username-status').textContent = '사용자 이름을 입력하세요.';
            document.getElementById('username-status').style.color = '#A30000';
            return;
        }

        handleApiCall(
            '/api/users/me/username', 
            'PUT',
            { username: newUsername },
            '이름이 성공적으로 수정되었습니다. 페이지를 새로고침해주세요.',
            'username-status'
        );
    });

    // 2. 비밀번호 변경
    document.getElementById('update-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        
        if (newPassword.length < 6) { 
            document.getElementById('password-status').textContent = '새 비밀번호는 6자 이상이어야 합니다.';
            document.getElementById('password-status').style.color = '#A30000';
            return;
        }

        handleApiCall(
            '/api/users/me/password', 
            'PUT',
            { currentPassword, newPassword },
            '비밀번호가 성공적으로 변경되었습니다. 보안을 위해 재로그인해주세요.',
            'password-status'
        );
    });

    // 3. Spotify 연동 해제
    const disconnectBtn = document.getElementById('disconnect-spotify');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            if (!confirm('정말로 Spotify 연동을 해제하시겠습니까? 연동 데이터가 삭제됩니다.')) return;
            
            handleApiCall(
                '/api/spotify/disconnect', 
                'DELETE',
                null, 
                'Spotify 연동이 해제되었습니다.',
                'spotify-status',
                '/setup' 
            );
        });
    }

    // 4. 회원 탈퇴
    document.getElementById('delete-account-btn').addEventListener('click', async () => {
        if (!confirm('경고: 계정을 영구적으로 삭제하고 모든 데이터를 지웁니다. 되돌릴 수 없습니다. 계속하시겠습니까?')) return;
        
        handleApiCall(
            '/api/users/me', 
            'DELETE',
            null, 
            '회원 탈퇴 완료. 안녕히 가세요!',
            'password-status', 
            '/' // 탈퇴 후 홈으로 이동
        );
    });
    
    // 5. 로그아웃 (POST API 호출)
    document.getElementById('logout-link').addEventListener('click', async (e) => {
        e.preventDefault(); 
        
        try {
            // POST /api/users/logout API 호출
            const res = await fetch('/api/users/logout', { method: 'POST' });
            
            if (res.ok) {
                // 성공 시 홈 화면으로 리다이렉트
                window.location.href = '/'; 
            } else {
                alert('로그아웃 처리 중 오류가 발생했습니다. (쿠키 수동 삭제 시도)');
                window.location.href = '/'; // 강제 이동
            }
        } catch (error) {
            console.error('Logout failed:', error);
            alert('로그아웃 요청 실패. 네트워크를 확인하세요.');
        }
    });