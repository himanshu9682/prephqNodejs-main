const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

exports.loginAdmin = async (req, res) => {
  try {
    const { email, adminname, password } = req.body;

    if ((!email && !adminname) || !password) {
      return res.status(400).json({
        status: false,
        message: "Email or adminname and password required"
      });
    }

    let admin;

    if (email) {
      admin = await Admin.findByEmail(email);
    } else {
      admin = await Admin.findByUsername(adminname);
    }

    if (!admin) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials"
      });
    }

    // Plain password check (because DB not hashed)
    if (password !== admin.password) {
      return res.status(401).json({
        status: false,
        message: "Invalid password"
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    await Admin.updateToken(admin.id, token);

    res.json({
      status: true,
      message: "Login successful",
      token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};
exports.logoutAdmin = async (req, res) => {
  try {
    await Admin.updateToken(req.admin.id, null);

    res.json({
      status: true,
      message: "Logout successful"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
};

