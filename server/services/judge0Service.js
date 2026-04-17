const axios = require('axios');

const JDOODLE_URL = 'https://api.jdoodle.com/v1/execute';

const LANGUAGE_CONFIG = {
  javascript: { language: 'nodejs',  versionIndex: '4' },
  python:     { language: 'python3', versionIndex: '4' },
  cpp:        { language: 'cpp17',   versionIndex: '1' },
  java:       { language: 'java',    versionIndex: '4' }
};

const STARTER_CODE = {
  javascript: `console.log("Hello, World!");`,
  python:     `print("Hello, World!")`,
  cpp:
`#include <iostream>
using namespace std;
int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  java:
`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`
};

exports.getStarterCode = (language) => {
  return STARTER_CODE[language] || '';
};

exports.executeCode = async (code, language, stdin = '') => {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const response = await axios.post(JDOODLE_URL, {
      clientId:     process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      script:       code,       // plain text, no base64
      language:     config.language,
      versionIndex: config.versionIndex,
      stdin:        stdin
    });

    const { output, statusCode, error } = response.data;
    
    return {
      stdout:   statusCode === 200 ? output : '',
      stderr:   statusCode !== 200 ? output : '',
      exitCode: statusCode === 200 ? 0 : 1,
      status:   statusCode === 200 ? 'Accepted' : 'Error'
    };

  } catch (error) {
    throw new Error(`JDoodle execution failed: ${error.message}`);
  }
};
