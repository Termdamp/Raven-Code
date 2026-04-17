const { executeCode } = require('../services/judge0Service');

exports.execute = async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    // This takes a few seconds — Judge0 compiles and runs it
    const result = await executeCode(code, language, stdin || '');

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Execution failed', error: error.message });
  }
};