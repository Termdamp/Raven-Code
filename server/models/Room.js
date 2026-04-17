const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Only this user can delete the room
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
      // Everyone who has ever joined, including owner
      // Used for dashboard — "show me all rooms I'm part of"
    }
  ],
  language: {
    type: String,
    default: 'javascript',
    enum: ['javascript', 'python', 'cpp', 'java']
    // enum means MongoDB rejects any other value
  },
  code: {
    type: String,
    default: ''
    // This is the LIVE code — changes as users type
    // NOT version history — that's what Session is for
  },
  isActive: {
    type: Boolean,
    default: true
    // Soft delete — instead of removing from DB, set to false
    // Safer because sessions still reference this room's _id
  }
}, { timestamps: true });
// timestamps: true auto-adds createdAt and updatedAt fields
// updatedAt updates automatically on every save — you don't manage it

module.exports = mongoose.model('Room', RoomSchema);