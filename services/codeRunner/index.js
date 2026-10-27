const { runJavaScript } = require('./languages/javascript');
const { runPython } = require('./languages/python');
const { runJava } = require('./languages/java');
const { runCpp } = require('./languages/cpp');

const LANGUAGE_RUNNERS = {
  javascript: runJavaScript,
  js: runJavaScript,
  python: runPython,
  py: runPython,
  java: runJava,
  cpp: runCpp,
  cxx: runCpp,
  'c++': runCpp
};

const normalizeLanguage = (language) => String(language || 'javascript').toLowerCase().trim();

const runCode = async ({ language, code, input, expectedOutput, timeoutMs }) => {
  const runner = LANGUAGE_RUNNERS[normalizeLanguage(language)];

  if (!runner) {
    return {
      status: 'UNSUPPORTED_LANGUAGE',
      output: '',
      error: `Unsupported language: ${language}`,
      executionTimeMs: 0
    };
  }

  return runner({ code, input, expectedOutput, timeoutMs });
};

module.exports = {
  runCode,
  normalizeLanguage,
  LANGUAGE_RUNNERS
};
