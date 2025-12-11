(function () {

  // ===========================================
  // 1. 현재 재생 중인 곡 (Now Playing Polling)
  // ===========================================
async function refresh() {
    const imgEl    = document.getElementById("np-cover-img");
    const nameEl   = document.getElementById("np-track-name");
    const artistEl = document.getElementById("np-artist");
    const cover    = document.getElementById("np-cover");

    if (!imgEl || !nameEl || !artistEl) return;

    try {
        const res = await fetch("/api/spotify/currently-playing", {
            credentials: "include",
        });

        if (res.status === 204) {
            imgEl.src = "/img/album-placeholder.png";
            nameEl.textContent = "음악을 재생해 보세요!";
            artistEl.textContent = " ";
            
            // CD 회전 정지
            cover.classList.remove("is-playing");
            return;
        }

        if (!res.ok) return;

        const d = await res.json();

        const isPlaying =
            d.is_playing ?? d.isPlaying ?? false;

        const trackName =
            d.trackName || d.name || (d.track && d.track.name) || "";

        const artist =
            d.artist ||
            (Array.isArray(d.artists) && d.artists[0]?.name) ||
            (d.track && d.track.artists?.[0]?.name) ||
            "";

        const albumCover =
            d.albumCover ||
            d.album?.images?.[0]?.url ||
            d.item?.album?.images?.[0]?.url ||
            "/img/album-placeholder.png";

        // 음악 없음
        if (!isPlaying || !trackName) {
            imgEl.src = "/img/album-placeholder.png";
            nameEl.textContent = "음악을 재생해 보세요!";
            artistEl.textContent = "";
            
            // CD 회전 정지
            cover.classList.remove("is-playing");
            return;
        }

        // 음악 재생 중 → 정보 갱신
        imgEl.src = albumCover;
        nameEl.textContent = trackName || "제목 없음";
        artistEl.textContent = artist || "-";

        // CD 돌리기
        cover.classList.add("is-playing");

    } catch (e) {
        console.error("Spotify API 폴링 오류:", e);
    }
}



  // ===========================================
  // 2. 홈페이지 피드 데이터 로드
  // ===========================================
  async function loadHomepageData() {
    try {
      const res = await fetch("/api/spotify/homepage-data", {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data.message || "데이터 로드 실패. 다시 시도해라.";
        const feed = document.querySelector(".editorial-feed");
        if (feed) {
          feed.innerHTML = `<p class="error">데이터 로드 실패: ${message}</p>`;
        }
        return;
      }

      // ===============================
      // 글로벌 Top 10
      // ===============================
      const globalContainer = document.getElementById("global-chart-container");

      if (data.globalTop && Array.isArray(data.globalTop.tracks) && globalContainer) {
        let html = '<div class="global-chart">';

        data.globalTop.tracks.forEach((track, index) => {
          const rank = index + 1;

          html += `
            <div class="global-card">
              <div class="global-card-left">
                <span class="global-rank">${rank}</span>
                ${
                  track.albumCover
                    ? `<img src="${track.albumCover}" alt="${track.name} 앨범 커버">`
                    : ""
                }
              </div>
              <div class="global-card-right">
                <p class="global-title-text">${track.name}</p>
                <p class="global-artist-text">${track.artist}</p>
              </div>
            </div>
          `;
        });

        html += "</div>";
        globalContainer.innerHTML = html;
      } else if (globalContainer) {
        globalContainer.innerHTML = '<p class="muted">데이터가 없다.</p>';
      }

      // ===============================
      // MY TOP 10
      // ===============================
      const topTracksContainer = document.getElementById("top-tracks-container");

      if (data.myTopTracks && Array.isArray(data.myTopTracks.tracks) && topTracksContainer) {
        let html = '<div class="global-chart">';

        data.myTopTracks.tracks.forEach((track, index) => {
          const rank = index + 1;

          html += `
            <div class="global-card">
              <div class="global-card-left">
                <span class="global-rank">${rank}</span>
                ${
                  track.albumCover
                    ? `<img src="${track.albumCover}" alt="${track.name} 앨범 커버">`
                    : ""
                }
              </div>
              <div class="global-card-right">
                <p class="global-title-text">${track.name}</p>
                <p class="global-artist-text">${track.artist}</p>
              </div>
            </div>
          `;
        });

        html += "</div>";
        topTracksContainer.innerHTML = html;
      } else if (topTracksContainer) {
        topTracksContainer.innerHTML = '<p class="muted">데이터가 없다.</p>';
      }

      // ===============================
      // 아티스트 Top 3
      // ===============================
      const topArtistsContainer = document.getElementById("top-artists-container");

      if (data.myTopArtists && Array.isArray(data.myTopArtists.artists) && topArtistsContainer) {
        let html = "";

        data.myTopArtists.artists.slice(0, 3).forEach((artist) => {
          html += `
            <div class="artist-card">
              <div class="artist-avatar">
                ${artist.image ? `<img src="${artist.image}" alt="${artist.name}">` : ""}
              </div>
              <p class="artist-name">${artist.name}</p>
            </div>
          `;
        });

        topArtistsContainer.innerHTML = html;
      } else if (topArtistsContainer) {
        topArtistsContainer.innerHTML = '<p class="muted">데이터가 없다.</p>';
      }
    } catch (e) {
      console.error("홈 피드 데이터 로드 오류:", e);
    }
  }
 




  // ===========================================
  // 초기 실행
  // ===========================================
  refresh();
  loadHomepageData();
  setInterval(refresh, 15000);

})();



