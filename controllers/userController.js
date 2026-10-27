const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const sanitizeString = (value) => {
	if (typeof value !== 'string') return value;
	return value.trim();
};

const ensureDir = async (dirPath) => {
	await fs.promises.mkdir(dirPath, { recursive: true });
};

const buildBaseUrl = (req) => {
	const base = process.env.APP_URL;
	if (base && base.trim().length > 0) return base.replace(/\/$/, '');
	return `${req.protocol}://${req.get('host')}`;
};

const saveUploadedFile = async (file, uploadDir, fileName) => {
	const targetPath = path.join(uploadDir, fileName);

	if (file.path) {
		await fs.promises.rename(file.path, targetPath);
		return targetPath;
	}

	if (file.buffer) {
		await fs.promises.writeFile(targetPath, file.buffer);
		return targetPath;
	}

	throw new Error('Invalid uploaded file payload');
};

class UserController {

	static async profileUpdate(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({ status: 0, error: 'Invalid token' });
			}

			const userId = req.user.id;

			const fields = [
				'name', 'lastname', 'email', 'username',
				'usertype', 'countrycode', 'phone', 'city',
				'portfolio', 'linkdin', 'github', 'codePen',
				'degreeOne', 'instituteOne', 'degreeTwo', 'instituteTwo',
				'organizationOne', 'designationOne', 'experienceonOne',
				'organizationTwo', 'designationTwo', 'experienceonTwo',
				'profile_image'
			];

			const updatedData = {};
			for (const field of fields) {
				if (Object.prototype.hasOwnProperty.call(req.body, field)) {
					updatedData[field] = sanitizeString(req.body[field]);
				}
			}

			if (Object.keys(updatedData).length === 0) {
				return res.json({ status: 0, error: 'Nothing to update or update failed' });
			}

			const updated = await User.updateProfile(userId, updatedData);
			if (!updated) {
				return res.json({ status: 0, error: 'Update failed' });
			}

			return res.json({ status: 1, message: 'Profile updated successfully' });
		} catch (e) {
			return res.status(500).json({ status: 0, error: e.message });
		}
	}

	static async uploadProfileImage(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({ status: 0, error: 'Invalid token' });
			}

			const userId = req.user.id;
			const file = req.file;

			if (!file) {
				return res.json({ status: 0, error: 'No file uploaded' });
			}

			const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
			const maxSize = 2 * 1024 * 1024;

			if (file.mimetype && !allowedTypes.includes(file.mimetype)) {
				return res.json({ status: 0, error: 'Invalid file type' });
			}

			if (file.size && file.size > maxSize) {
				return res.json({ status: 0, error: 'File too large' });
			}

			const currentUser = await User.findById(userId);
			if (currentUser && currentUser.profile_image) {
				const oldPath = path.join(process.cwd(), currentUser.profile_image);
				if (fs.existsSync(oldPath) && !currentUser.profile_image.includes('default')) {
					try {
						await fs.promises.unlink(oldPath);
					} catch (_) {
						
					}
				}
			}

			const uploadDir = path.join(process.cwd(), 'uploads', 'profile_images');
			await ensureDir(uploadDir);

			const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
			const newFileName = `profile_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
			const targetPath = await saveUploadedFile(file, uploadDir, newFileName);

			const dbPath = path.join('uploads', 'profile_images', newFileName).replace(/\\/g, '/');

			const updated = await User.updateProfile(userId, { profile_image: dbPath });
			if (!updated) {
				try {
					await fs.promises.unlink(targetPath);
				} catch (_) {
				
				}
				return res.json({ status: 0, error: 'Database update failed' });
			}

			const baseUrl = buildBaseUrl(req);
			const fullUrl = `${baseUrl}/${dbPath}`.replace(/\/+/g, '/');

			return res.json({ status: 'success', image: fullUrl });
		} catch (e) {
			return res.status(500).json({ status: 0, error: e.message });
		}
	}

	static async uploadResume(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({ status: 0, error: 'Invalid token' });
			}

			const userId = req.user.id;
			const file = req.file;

			if (!file) {
				return res.json({ status: 0, error: 'No file uploaded' });
			}

			const allowedTypes = [
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/octet-stream',
				'application/x-pdf'
			];
			const allowedExts = ['.pdf', '.doc', '.docx'];
			const maxSize = 2 * 1024 * 1024;

			const ext = path.extname(file.originalname || '').toLowerCase();
			if ((file.mimetype && !allowedTypes.includes(file.mimetype)) && !allowedExts.includes(ext)) {
				return res.json({ status: 0, error: 'Invalid file type (only PDF, DOC, DOCX allowed)' });
			}

			if (file.size && file.size > maxSize) {
				return res.json({ status: 0, error: 'File too large' });
			}

			const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
			await ensureDir(uploadDir);

			const newFileName = `resume_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext || '.pdf'}`;
			const targetPath = await saveUploadedFile(file, uploadDir, newFileName);

			const dbPath = path.join('uploads', 'resumes', newFileName).replace(/\\/g, '/');
			const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

			const updated = await User.updateProfile(userId, { resume: dbPath, resume_date: currentDate });
			if (!updated) {
				try {
					await fs.promises.unlink(targetPath);
				} catch (_) {
					
				}
				return res.json({ status: 0, error: 'Database update failed' });
			}

			return res.json({
				status: 'success',
				resume: dbPath,
				resumeDate: currentDate
			});
		} catch (e) {
			return res.status(500).json({ status: 0, error: e.message });
		}
	}

	static async deleteResume(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({ status: 0, error: 'Invalid token' });
			}

			const userId = req.user.id;
			const currentUser = await User.findById(userId);

			if (!currentUser || !currentUser.resume) {
				return res.json({ status: 0, error: 'No resume found to delete' });
			}

			const resumePath = path.join(process.cwd(), currentUser.resume);
			if (fs.existsSync(resumePath) && !currentUser.resume.includes('default')) {
				try {
					await fs.promises.unlink(resumePath);
				} catch (e) {
					return res.json({ status: 0, error: 'Failed to delete resume file' });
				}
			} else {
				return res.json({ status: 0, error: 'Resume file does not exist' });
			}

			const updated = await User.updateProfile(userId, { resume: null, resume_date: null });
			if (!updated) {
				return res.json({ status: 0, error: 'Failed to update database' });
			}

			return res.json({ status: 'success', message: 'Resume deleted successfully' });
		} catch (e) {
			return res.status(500).json({ status: 0, error: e.message });
		}
	}

	static async getUser(req, res) {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({ status: 0, error: 'Invalid token' });
			}

			const userId = req.user.id;
			const user = await User.findById(userId);

			if (!user) {
				return res.json({ status: 0, error: 'User not found' });
			}

			const baseUrl = buildBaseUrl(req);
			const userData = { ...user };
			userData.profile_image_url = user.profile_image
				? `${baseUrl}/${user.profile_image}`.replace(/\/+/g, '/')
				: null;
			userData.resume_url = user.resume
				? `${baseUrl}/${user.resume}`.replace(/\/+/g, '/')
				: null;

			delete userData.password;

			return res.json({ status: 1, user: userData });
		} catch (e) {
			return res.status(500).json({ status: 0, error: e.message });
		}
	}
}

module.exports = UserController;

