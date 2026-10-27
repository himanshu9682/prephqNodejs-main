const normalizeOutput = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\r\n/g, '\n').trim();
};

const buildRuntimeError = (stderr) => {
  const message = (stderr || '').trim();
  if (!message) return 'Runtime Error';
  return message;
};

module.exports = {
  normalizeOutput,
  buildRuntimeError
};
