const Room = require('../models/Room');
const User = require('../models/User');
const { nanoid } = require('nanoid');
const { getStarterCode } = require('../services/judge0Service');

// CREATE ROOM 
exports.createRoom = async (req, res) => {
  try {
    const { name, language = 'javascript' } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const roomId = nanoid(6);
    // Generates a random 6-character ID like "xK9p2m"
    // Collision chance is astronomically low at this scale

    const room = await Room.create({
      roomId,
      name,
      language,
      owner: req.user.userId,
      members: [req.user.userId],
      // Owner is automatically the first member
      code: getStarterCode(language)
      // Editor starts with Hello World, not a blank screen
    });

    // Also store room reference in the user's rooms array
    await User.findByIdAndUpdate(
      req.user.userId,
      { $addToSet: { rooms: room._id } }
      // $addToSet = add only if not already there (prevents duplicates)
      // Safer than $push which would add duplicates
    );

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET MY ROOMS 
exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      members: req.user.userId,
      // Find all rooms where this user is in the members array
      isActive: true
    })
      .populate('owner', 'username email')
      // Replace owner ObjectId with actual user data
      // 'username email' means only return those two fields
      .sort({ updatedAt: -1 });
      // Most recently updated first

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET SINGLE ROOM 
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({
      roomId: req.params.roomId,
      isActive: true
    })
      .populate('owner', 'username email')
      .populate('members', 'username email');
      // Get full user details for everyone in the room
      // Frontend uses this to show who's in the room

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// JOIN ROOM 
exports.joinRoom = async (req, res) => {
  try {
    const room = await Room.findOne({
      roomId: req.params.roomId,
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Add user to room's members (if not already there)
    await Room.findByIdAndUpdate(
      room._id,
      { $addToSet: { members: req.user.userId } }
    );

    // Add room to user's rooms (if not already there)
    await User.findByIdAndUpdate(
      req.user.userId,
      { $addToSet: { rooms: room._id } }
    );

    res.json({ message: 'Joined room successfully', roomId: room.roomId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE ROOM
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Only the owner can delete
    if (room.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only the room owner can delete this room' });
    }
    // Soft delete — don't actually remove from DB
    await Room.findByIdAndUpdate(room._id, { isActive: false });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CHANGE LANGUAGE 
exports.changeLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    const validLanguages = ['javascript', 'python', 'cpp', 'java'];

    if (!validLanguages.includes(language)) {
      return res.status(400).json({ message: 'Invalid language' });
    }

    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId, isActive: true },
      { language },
      { new: true }
      // new: true returns the updated document, not the old one
    );

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};