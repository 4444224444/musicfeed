// server/server.js

// 1) 환경/의존 모듈
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { attachUserIfAny } = require('./middleware/authMiddleware');

connectDB();

// 2) 앱 기본 설정
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());          // 쿠키 읽기
app.use(attachUserIfAny);         // 쿠키/헤더/쿼리에서 토큰 읽어 req.user 채움

// 3) EJS(뷰) 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 4) 정적 파일
app.use(express.static(path.join(__dirname, 'public')));

// 5) 모든 페이지에서 공통 값 (EJS에서 user/currentPath 바로 사용)
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// 6) API 라우트
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/spotify', require('./routes/spotify'));
app.use('/api/feed', require('./routes/feed'));

// ──────────────────────────────────────────────────────────────
// 🔐 페이지용 로그인 가드 (SSR 페이지 보호가 필요할 때 사용)
const requireLoginPage = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  next();
};
// ──────────────────────────────────────────────────────────────

// 7) 페이지 라우트 (SSR 단계에서 현재곡은 브라우저가 직접 호출)
app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

app.get('/login',    (req, res) => res.render('login',    { title: 'Login' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register' }));

// ✅ /me 라우트는 "한 번만" 정의 + me 데이터 넘김
app.get('/me', requireLoginPage, (req, res) => {
  const me = {
    _id: req.user._id,
    username: req.user.username,
    createdAt: req.user.createdAt,
    linkedSpotify: !!req.user.spotifyAccessToken,
  };
  res.render('me', { title: 'My Page', me });
});

app.get('/feed',   (req, res) => res.render('feed',   { title: 'Feed' }));
app.get('/recent', (req, res) => res.render('recent', { title: 'Recent' }));
app.get('/friends',(req, res) => res.render('friends',{ title: 'Friends' }));

// 8) 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});




