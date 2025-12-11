// server/controllers/myLogController.js
const MyLog = require('../models/myLogModel');
const User = require('../models/userModel'); // ← 추가


// 내 MY-LOG 전체 가져오기
exports.getMyLogs = async (req, res) => {
  try {
    const logs = await MyLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username nickname');

    res.status(200).json(logs);
  } catch (err) {
    console.error('MY-LOG 목록 조회 오류:', err);
    res.status(500).json({ message: 'MY-LOG 조회 중 오류.' });
  }
};

// 새 로그 작성
// 새 로그 작성
// 새 로그 작성
exports.createMyLog = async (req, res) => {
  try {
    const { title, content, track } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '감상 내용을 입력해 달라.' });
    }

    if (!track || !track.id) {
      return res.status(400).json({ message: '곡을 선택해 달라.' });
    }

    const doc = await MyLog.create({
      userId: req.user._id,
      title: title ? title.trim() : '',
      content: content.trim(),
      track: {
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        albumCover: track.albumCover || null,
        spotifyUrl: track.spotifyUrl || null,
      },
      comments: [],
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('MY-LOG 생성 오류:', err);
    res.status(500).json({ message: 'MY-LOG 생성 중 오류.' });
  }
};

// 본문이랑댓글보기
// 🔹 특정 글 상세 조회 (본문 + 댓글)
exports.getMyLogDetail = async (req, res) => {
  try {
    const log = await MyLog.findById(req.params.id)
      .populate('userId', 'username nickname')
    .populate('comments.userId', 'username nickname');

    if (!log) {
      return res.status(404).json({ message: '글을 찾을 수 없다.' });
    }

    res.status(200).json(log);
  } catch (err) {
    console.error('MY-LOG 상세 조회 오류:', err);
    res.status(500).json({ message: 'MY-LOG 상세 조회 중 오류.' });
  }
};


// 🔹 댓글 추가
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: '댓글 내용을 입력해 달라.' });
    }

    const log = await MyLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: '글을 찾을 수 없다.' });
    }

    log.comments.push({
      userId: req.user._id,
      content: content.trim(),
    });

    await log.save();

    // 방금 추가된 댓글만 populate 해서 반환
   const populated = await log.populate('comments.userId', 'username nickname');
    const lastComment = populated.comments[populated.comments.length - 1];

    res.status(201).json(lastComment);
  } catch (err) {
    console.error('댓글 추가 오류:', err);
    res.status(500).json({ message: '댓글 추가 중 오류.' });
  }
};



// 🔹 댓글 삭제 (본인 댓글만)
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const log = await MyLog.findOne({
      'comments._id': commentId,
      'comments.userId': req.user._id,
    });

    if (!log) {
      return res
        .status(404)
        .json({ message: '댓글을 찾을 수 없거나 권한이 없다.' });
    }

    log.comments = log.comments.filter(
      (c) => String(c._id) !== String(commentId)
    );
    await log.save();

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('댓글 삭제 오류:', err);
    res.status(500).json({ message: '댓글 삭제 중 오류.' });
  }
};




// 로그 수정 (감상평, 필요하면 곡도 바꿀 수 있게)
exports.updateMyLog = async (req, res) => {
  try {
    const { content, track } = req.body;

    const update = {};
    if (content !== undefined) update.content = content.trim();
    if (track && track.id) {
      update.track = {
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        albumCover: track.albumCover || null,
        spotifyUrl: track.spotifyUrl || null,
      };
    }

    const updated = await MyLog.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: '로그를 찾을 수 없다.' });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error('MY-LOG 수정 오류:', err);
    res.status(500).json({ message: 'MY-LOG 수정 중 오류.' });
  }
};

// 로그 삭제
exports.deleteMyLog = async (req, res) => {
  try {
    const deleted = await MyLog.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: '로그를 찾을 수 없다.' });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('MY-LOG 삭제 오류:', err);
    res.status(500).json({ message: 'MY-LOG 삭제 중 오류.' });
  }
};

exports.getFeedLogs = async (req, res) => {
  try {
    // 1) 내 친구 목록 가져오기
    const me = await User.findById(req.user._id).select('friends');
    const friendIds = me?.friends || [];

    // 나 자신 + 친구들
    const targetIds = [req.user._id, ...friendIds];

    // 2) 해당 유저들의 로그 찾기
    const logs = await MyLog.find({ userId: { $in: targetIds } })
      .sort({ createdAt: -1 })
      .populate('userId', 'username nickname');

    res.status(200).json(logs);
  } catch (err) {
    console.error('MY-LOG 피드 조회 오류:', err);
    res.status(500).json({ message: 'MY-LOG 피드 조회 중 오류.' });
  }
};

// 특정 유저의 MY-LOG 전체
exports.getUserLogs = async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    const logs = await MyLog.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .populate('userId', 'username nickname');

    res.status(200).json(logs);
  } catch (err) {
    console.error('특정 유저 MY-LOG 조회 오류:', err);
    res.status(500).json({ message: '특정 유저 MY-LOG 조회 중 오류.' });
  }
};
