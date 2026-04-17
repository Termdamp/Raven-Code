const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  saveSession,
  getRoomSessions,
  getSession,
  deleteSession
} = require('../controllers/sessionController');

router.post('/', auth, saveSession);
router.get('/room/:roomId', auth, getRoomSessions);
router.get('/:sessionId', auth, getSession);
router.delete('/:sessionId', auth, deleteSession);

module.exports = router;