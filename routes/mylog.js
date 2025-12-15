// server/routes/mylog.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const myLogController = require('../controllers/myLogController');

function mustFn(fn, name) {
  if (typeof fn !== 'function') {
    throw new Error(`myLogController.${name} is not a function (got ${typeof fn})`);
  }
  return fn;
}

router.get('/', protect, mustFn(myLogController.getMyLogs, 'getMyLogs'));
router.get('/user/:userId', protect, mustFn(myLogController.getUserLogs, 'getUserLogs'));
router.get('/feed', protect, mustFn(myLogController.getFeedLogs, 'getFeedLogs'));

router.post('/', protect, mustFn(myLogController.createMyLog, 'createMyLog'));

router.put('/:id', protect, mustFn(myLogController.updateMyLog, 'updateMyLog'));
router.delete('/:id', protect, mustFn(myLogController.deleteMyLog, 'deleteMyLog'));

router.get('/post/:id', protect, mustFn(myLogController.getMyLogDetail, 'getMyLogDetail'));
router.get('/:id/comments', protect, mustFn(myLogController.getComments, 'getComments')); // ✅

router.post('/:id/comments', protect, mustFn(myLogController.addComment, 'addComment'));
router.delete('/comments/:commentId', protect, mustFn(myLogController.deleteComment, 'deleteComment'));

module.exports = router;

