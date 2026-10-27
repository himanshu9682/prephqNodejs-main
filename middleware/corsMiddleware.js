const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

module.exports = cors(corsOptions);