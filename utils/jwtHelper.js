const jwt = require('jsonwebtoken');

exports.generate = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

exports.verify = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

exports.getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;
  return header.split(' ')[1];
};
