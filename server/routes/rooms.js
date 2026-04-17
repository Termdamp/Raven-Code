const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  createRoom,
  getMyRooms,
  getRoom,
  joinRoom,
  deleteRoom,
  changeLanguage
} = require('../controllers/roomController');

// All room routes are protected — user must be logged in
router.post('/', auth, createRoom);
router.get('/my', auth, getMyRooms);
router.get('/:roomId', auth, getRoom);
router.post('/:roomId/join', auth, joinRoom);
router.delete('/:roomId', auth, deleteRoom);
router.patch('/:roomId/language', auth, changeLanguage);

module.exports = router;