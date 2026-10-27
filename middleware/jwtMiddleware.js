const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ status: 0, error: 'Token missing' });
    }

    const token = auth.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user || decoded;
        next();
    } catch (e) {
        return res.status(401).json({ status: 0, error: 'Invalid token' });
    }
};
