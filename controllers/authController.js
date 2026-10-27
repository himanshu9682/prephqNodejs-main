const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const AccountConfirm = require('../models/AccountConfirm');
const { sendVerificationEmail, sendResetEmail } = require('../utils/mailer');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const buildBaseUrl = (req) => {
    const base = process.env.APP_URL;
    if (base && base.trim().length > 0) return base.replace(/\/$/, '');
    return `${req.protocol}://${req.get('host')}`;
};

const buildFileUrl = (baseUrl, filePath) => {
    if (!filePath) return null;
    return `${baseUrl}/${String(filePath).replace(/^\/+/, '')}`;
};

class AuthController {

    /* ================= REGISTER ================= */
static async register(req, res) {
    try {
        const { name, lastname, username, email, password} = req.body;

        if (!name || !lastname || !username || !email || !password) {
            return res.json({ status: 0, error: 'All fields required' });
        }

        const exists =
            await User.findByEmail(email) ||
            await User.findByUsername(username);

        if (exists) {
            return res.json({ status: 0, error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = await User.create({
            name: name,
            lastname,
            username,
            email,
            password: hashedPassword,
           
        });

        // ===== OTP =====
        const otp = Math.floor(10000 + Math.random() * 90000);

        // 10 minutes expiry
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await AccountConfirm.create({
            user_id: userId,
            email,
            code: otp,
            expires_at: expiresAt
        });

        const confirmToken = jwt.sign(
            { email, purpose: 'confirm' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Send verification email
        const mailSent = await sendVerificationEmail(email, name, otp);
        if (!mailSent) {
            return res.status(500).json({
                status: 0,
                error: 'Unable to send verification email. Please try again.'
            });
        }

        return res.json({
            status: 1,
            message: 'Registered successfully',
            confirm_token: confirmToken
        });

    } catch (e) {
        return res.status(500).json({ status: 0, error: e.message });
    }
}

    /* ================= CONFIRM ================= */
static async confirm(req, res) {
    try {
        const { email, purpose } = req.user; 
        const { otp } = req.body;

        if (purpose !== 'confirm') {
            return res.json({ status: 0, error: 'Invalid token purpose' });
        }

        if (!otp) {
            return res.json({ status: 0, error: 'OTP required' });
        }

        const confirmRow = await AccountConfirm.findActive(email);
        if (!confirmRow) {
            return res.json({ status: 0, error: 'OTP not found' });
        }

        if (confirmRow.code !== String(otp)) {
            return res.json({ status: 0, error: 'Invalid OTP' });
        }

        await AccountConfirm.markVerified(confirmRow.id);

      
        const loginToken = jwt.sign(
            {
                user: {
                    id: confirmRow.user_id,
                    email: email
                }
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            status: 1,
            token: loginToken,
            message: 'Account verified'
        });

    } catch (e) {
        return res.status(500).json({ status: 0, error: e.message });
    }
}



    /* ================= LOGIN ================= */
    static async login(req, res) {
        try {
            const { email, username, password } = req.body;

            if ((!email && !username) || !password) {
                return res.json({ status: 0, error: 'Missing credentials' });
            }

            const user = await User.findByIdentifier(email || username);
            if (!user) {
                return res.json({ status: 0, error: 'User not found' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.json({ status: 0, error: 'Wrong password' });
            }

            const token = jwt.sign(
                {
                    user: {
                        id: user.id,
                        email: user.email,
                        username: user.username
                    }
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                status: 1,
                token,
                user: {
                    name: user.name,
                    lastname: user.lastname,
                    username: user.username,
                    email: user.email,
                    resume_url: buildFileUrl(buildBaseUrl(req), user.resume)
                },
                message: 'Login successful'
            });

        } catch (e) {
            return res.status(500).json({ status: 0, error: e.message });
        }
    }

    /* ================= REQUEST RESET ================= */
   static async request_Reset(req, res) {
    try {
        const identifier = req.body.username || req.body.email || null;

        if (!identifier) {
            return res.json({ status: 0, error: 'Missing username or email' });
        }

        const user = await User.findByIdentifier(identifier);
        if (!user) {
            return res.json({ status: 0, error: 'User not found' });
        }

        const code = Math.floor(10000 + Math.random() * 90000);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await AccountConfirm.upsert({
            user_id: user.id,
            email: user.email,
            code,
            expires_at: expiresAt
        });

        const resetToken = jwt.sign(
            { email: user.email, purpose: 'reset' },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Send reset email
        await sendResetEmail(user.email, user.name, code);

        return res.json({
            status: 1,
            confirm_token: resetToken,
            message: 'Reset code sent to email'
        });

    } catch (e) {
        return res.status(500).json({ status: 0, error: e.message });
    }
}

    /* ================= RESEND CONFIRM CODE ================= */
    static async resendCode(req, res) {
        try {
            const { email, purpose } = req.user || {};

            if (!email || purpose !== 'confirm') {
                return res.json({ status: 0, error: 'Invalid token payload' });
            }

            const user = await User.findByEmail(email);
            const name = user?.name || 'User';

            const code = await AccountConfirm.createConfirmCode(email, 5, user?.id || 0);
            if (!code) {
                return res.json({ status: 0, error: 'Failed to generate new confirmation code' });
            }

            await sendVerificationEmail(email, name, code);

            return res.json({
                status: 1,
                message: 'New code sent'
            });

        } catch (e) {
            return res.status(500).json({ status: 0, error: e.message });
        }
    }

    /* ================= VERIFY CODE ================= */
    static async verifyCode(req, res) {
        try {
            const { email, purpose } = req.user;
            const { code } = req.body;

            if (!code) {
                return res.json({ status: 0, error: 'Missing code' });
            }

            if (purpose !== 'reset') {
                return res.json({ status: 0, error: 'Invalid token purpose' });
            }

            const confirmRow = await AccountConfirm.findActive(email);
            if (!confirmRow) {
                return res.json({ status: 0, error: 'Invalid or expired code' });
            }

            if (confirmRow.code !== String(code)) {
                await AccountConfirm.delete(email);
                return res.json({ status: 0, error: 'Invalid or expired code' });
            }

            const resetToken = jwt.sign(
                { email, purpose: 'reset_verified' },
                process.env.JWT_SECRET,
                { expiresIn: '10m' }
            );

            await AccountConfirm.delete(email);

            return res.json({
                status: 1,
                reset_token: resetToken,
                message: 'Code verified successfully'
            });

        } catch (e) {
            return res.status(500).json({ status: 0, error: e.message });
        }
    }

    /* ================= RESET PASSWORD ================= */
    static async resetPassword(req, res) {
        try {
            const { email, purpose } = req.user;
            const { username, new_password } = req.body;

            if (!username || !new_password) {
                return res.json({ status: 0, error: 'Missing required fields' });
            }

            if (purpose !== 'reset_verified') {
                return res.json({ status: 0, error: 'Invalid token purpose' });
            }

            const user = await User.findByIdentifier(username);
            if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
                return res.json({ status: 0, error: 'User not found or email mismatch' });
            }

            const isSamePassword = await bcrypt.compare(new_password, user.password);
            if (isSamePassword) {
                return res.json({ status: 1, message: 'Password already updated' });
            }

            const hashedPassword = await bcrypt.hash(new_password, 10);
            await User.updatePassword(user.id, hashedPassword);

            return res.json({
                status: 1,
                message: 'Password reset successful'
            });

        } catch (e) {
            return res.status(500).json({ status: 0, error: e.message });
        }
    }
    static async profileUpdate(req, res) {
        try {
            const { name, lastname, username, email } = req.body;
            const userId = req.user.id;

            if (!name || !lastname || !username || !email) {
                return res.json({ status: 0, error: 'All fields required' });
            }

            const exists =
                await User.findByEmail(email) ||
                await User.findByUsername(username);

            if (exists && exists.id !== userId) {
                return res.json({ status: 0, error: 'Email or username already in use' });
            }

            await User.updateProfile(userId, { name, lastname, username, email });

            return res.json({
                status: 1,
                message: 'Profile updated successfully'
            });

        } catch (e) {
            return res.status(500).json({ status: 0, error: e.message });
        }
    }

    /* ================= GET USER ================= */
    static async me(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ status: 0, error: 'Invalid token' });
            }

            const user = await User.findById(req.user.id);
            if (!user) {
                return res.json({ status: 0, error: 'User not found' });
            }

            const baseUrl = buildBaseUrl(req);
            const userData = { ...user };
            userData.profile_image_url = buildFileUrl(baseUrl, user.profile_image);
            userData.resume_url = buildFileUrl(baseUrl, user.resume);

            delete userData.password;

            return res.json({
                status: 1,
                user: userData,
                message: 'User retrieved successfully'
            });
        } catch (e) {
            return res.status(500).json({ status: 0, error: e.message });
        }
    }

    /* ================= LOGOUT ================= */
    static async logout(req, res) {
        try {
            return res.json({
                status: 1,
                message: 'Logout successful'
            });
        } catch (e) {
            return res.status(500).json({ status: 0, error: e.message });
        }
    }

    /* ================= GOOGLE LOGIN ================= */
    static async googleLogin(req, res) {
        try {
            const { id_token } = req.body;

            if (!id_token) {
                return res.status(400).json({ status: 0, error: 'id_token is required' });
            }

            // Verify token with Google
            const ticket = await googleClient.verifyIdToken({
                idToken: id_token,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            const { sub: google_id, email, given_name: name, family_name: lastname, picture: profile_image } = payload;

            if (!email) {
                return res.status(400).json({ status: 0, error: 'Google account has no email' });
            }

            const { user, isNew } = await User.findOrCreateGoogleUser({
                google_id,
                email,
                name,
                lastname,
                profile_image
            });

            const token = jwt.sign(
                { user: { id: user.id, email: user.email, username: user.username } },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                status: 1,
                token,
                isNew,
                user: {
                    name: user.name,
                    lastname: user.lastname,
                    username: user.username,
                    email: user.email,
                    profile_image_url: user.profile_image || null
                },
                message: isNew ? 'Account created via Google' : 'Login successful'
            });

        } catch (e) {
            // Google token verification failed
            if (e.message && e.message.includes('Token used too late')) {
                return res.status(401).json({ status: 0, error: 'Google token expired' });
            }
            return res.status(500).json({ status: 0, error: e.message });
        }
    }
}

module.exports = AuthController;
