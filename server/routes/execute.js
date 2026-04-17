const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { execute } = require('../controllers/executeController');

router.post('/', auth, execute);

module.exports = router;