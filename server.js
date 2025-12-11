// =========================
// 기본 모듈 & 환경 설정
// =========================
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { attachUserIfAny } = require('./middleware/authMiddleware');


const myLogRoutes = require('./routes/mylog'); 
const User = require('./models/userModel');

connectDB();

// =========================
// Express 세팅
// =========================
const app = express();

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: false, limit: '3mb' }));

app.use(cookieParser());
app.use(attachUserIfAny); // req.user 자동 주입

app.use(express.static("public"));

// =========================
// EJS 뷰 세팅
// =========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.static(path.join(__dirname, 'public')));

// 모든 페이지에서 user 사용 가능
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// =========================
// API 라우트 연결
// =========================
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/spotify', require('./routes/spotify'));        // Spotify
app.use('/api/feed', require('./routes/feed'));              // 피드
app.use('/api/playlists', require('./routes/playlists'));    // 플리메이커
app.use('/api/mylog', myLogRoutes);


// =========================
// 로그인 보호 미들웨어
// =========================
const requireLoginPage = (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  next();
};

// =========================
// 페이지 라우트
// =========================

// 홈
app.get('/', (req, res) => res.render('home', { title: 'Home' }));

// 로그인/회원가입
app.get('/login', (req, res) => res.render('login', { title: 'Login' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register' }));

// 보호된 페이지
app.get('/recent', requireLoginPage, (req, res) =>
  res.render('recent', { title: 'Recent' })
);
app.get('/friends', requireLoginPage, (req, res) =>
  res.render('friends', { title: 'Friends' })
);

// ⭐ 플레이리스트 페이지
app.get('/playlists', requireLoginPage, (req, res) => {
  res.render('playlists', { title: 'Playlists' });
});



// M-LOG 홈 피드 페이지
app.get('/m-log', requireLoginPage, async (req, res) => {
  try {
    // 로그인한 내 정보 + 친구 목록
    const me = await User.findById(req.user._id)
      .populate('friends', 'username')  // 친구 username만
      .select('username friends');      // 나도 username/friends만

    res.render('m-log', {
      title: 'M-LOG',
      me,
      friends: me.friends,
    });
  } catch (err) {
    console.error('M-LOG 페이지 렌더링 오류:', err);
    res.status(500).send('M-LOG 페이지를 불러오는 중 오류가 발생했다.');
  }
});


// MYLOG
app.get('/mylog', requireLoginPage, (req, res) => {
  res.render('mylog', { title: 'My Log' });
});

// 🔹 MYLOG 글 상세 페이지
app.get('/mylog/post/:postId', requireLoginPage, (req, res) => {
  res.render('mylog-detail', {
    title: 'M-LOG 상세',
    postId: req.params.postId,
    myUserId: req.user._id,
  });
});

// 특정 유저 MYLOG 페이지
app.get('/mylog/:userId', requireLoginPage, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // 이 페이지 주인 유저 정보
    const profileUser = await User.findById(targetUserId).select('username');

    if (!profileUser) {
      return res.status(404).send('유저를 찾을 수 없다.');
    }

    const isMe = String(targetUserId) === String(req.user._id);

    res.render('mylog', {
      title: 'My Log',
      profileUser,         // 이 페이지 주인
      isMe,                // 내가 내 페이지 보고 있는지
    });
  } catch (err) {
    console.error('MYLOG 페이지 렌더링 오류:', err);
    res.status(500).send('MYLOG 페이지 로드 중 오류가 발생했다.');
  }
});

// SETUP
app.get('/setup', requireLoginPage, (req, res) => {
  res.render('setup', { title: 'Settings' });
});

// 로그아웃 (쿠키 지우는 로직 있으면 여기서 처리해도 됨)
app.get('/logout', (req, res) => {
  res.redirect('/');
});


// =========================
// 서버 시작
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행: http://localhost:${PORT}`);
});
