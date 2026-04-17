const Session = require('../models/Session');
const Room = require('../models/Room');

// SAVE SESSION
exports.saveSession = async (req, res) => {
  try {
    const { roomId, code, language, label } = req.body;

    // Find the room using the short roomId string
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Count existing sessions for this room
    const count = await Session.countDocuments({ room: room._id });

    if (count >= 10) {
      // Find and delete the oldest session to make room for new one
      // This is a rolling window — always keep the 10 most recent saves
      const oldest = await Session.findOne({ room: room._id }).sort({ createdAt: 1 });
      await oldest.deleteOne();
    }

    const session = await Session.create({
      room: room._id,
      savedBy: req.user.userId,
      code,
      language,
      label: label || ''
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET ALL SESSIONS FOR A ROOM
exports.getRoomSessions = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const sessions = await Session.find({ room: room._id })
      .populate('savedBy', 'username')
      // Show who saved each session
      .sort({ createdAt: -1 });
      // Most recent first

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET SINGLE SESSION
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('savedBy', 'username')
      .populate('room', 'roomId name');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE SESSION
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only the person who saved it can delete it
    if (session.savedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this session' });
    }

    await session.deleteOne();
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};