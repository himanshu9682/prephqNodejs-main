const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseUpload = path.join(__dirname, "../../uploads");

// tutorial folder
const tutorialBase = path.join(baseUpload, "tutorial");

// year/month folder
const getTutorialDateFolder = () => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const folder = path.join(tutorialBase, year, month);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return folder;
};

// author image folder
const getAuthorFolder = () => {
  const folder = path.join(tutorialBase, "author_images");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  return folder;
};

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    let dest;

    if (["author_image", "authorImage", "author_image[]", "author_name_image", "authorImage[]"].includes(file.fieldname)) {
      dest = getAuthorFolder();
    } else {
      dest = getTutorialDateFolder();
    }

    cb(null, dest);
  },

  filename: (req, file, cb) => {

    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

    let prefix = "file";

    if (["featured_image", "feature_image", "featuredImage", "featured_image[]", "feature_image[]", "fetured_image"].includes(file.fieldname)) prefix = "featured";
    if (file.fieldname === "content_image") prefix = "content";
    if (["author_image", "authorImage", "author_image[]", "authorImage[]", "author_name_image"].includes(file.fieldname)) prefix = "author";

    cb(null, `${prefix}-${unique}${path.extname(file.originalname)}`);
  }

});

const tutorialUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
}).fields([
  { name: "featured_image", maxCount: 1 },
  { name: "feature_image", maxCount: 1 },
  { name: "featuredImage", maxCount: 1 },
  { name: "featured_image[]", maxCount: 1 },
  { name: "feature_image[]", maxCount: 1 },
  { name: "fetured_image", maxCount: 1 },
  { name: "author_image", maxCount: 1 },
  { name: "authorImage", maxCount: 1 },
  { name: "author_image[]", maxCount: 1 },
  { name: "authorImage[]", maxCount: 1 },
  { name: "author_name_image", maxCount: 1 },
  { name: "content_image", maxCount: 10 }
]);

module.exports = {
  tutorialUpload
};