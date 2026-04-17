const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
    // References Room._id (not roomId string)
    // This is how MongoDB knows which room this session belongs to
  },
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Which user hit the Save button
  },
  code: {
    type: String,
    required: true
    // Snapshot of code at the time of saving
  },
  language: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: ''
    // Optional name like "working bubble sort" or "before refactor"
    // If empty, frontend can show the timestamp instead
  }
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);