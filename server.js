// 여기 모듈
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { attachUserIfAny } = require('./middleware/authMiddleware');

connectDB();

// 기본 설정 
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());          // 쿠키 읽기
app.use(attachUserIfAny);         // 쿠키/헤더/쿼리에서 토큰 읽어 req.user 채움

// ejs 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 정적
app.use(express.static(path.join(__dirname, 'public')));

// 모든 페이지
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// API 라우트
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/spotify', require('./routes/spotify'));
app.use('/api/feed', require('./routes/feed'));

// 로그인 가드
const requireLoginPage = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  next();
};


// 페이지 라우트
app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

app.get('/login',    (req, res) => res.render('login',    { title: 'Login' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register' }));

// me, my page
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

// 서버 실행
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});




