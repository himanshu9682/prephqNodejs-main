const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
    const auth = req.headers.authorization;

    if (!auth) {
        return res.status(401).json({ status: 0, error: 'Token missing' });
    }

    const token = auth.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 0, error: 'Token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const adminId = decoded.id || decoded.user?.id;

        if (!adminId) {
            return res.status(403).json({ status: 0, error: 'Admin access required' });
        }

        const admin = await Admin.findById(adminId);

        if (!admin || admin.token !== token) {
            return res.status(403).json({ status: 0, error: 'Admin access required' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({ status: 0, error: 'Invalid token' });
    }
};