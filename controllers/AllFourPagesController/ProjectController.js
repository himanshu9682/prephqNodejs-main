const Project = require("../../models/AllFourPagesModel/Project");
const path = require("path");
const fs = require("fs");

const BASE_URL = "https://backend.prephq.theiotacademy.co";
const UPLOADS_ROOT = path.join(__dirname, "../../uploads");

const getCurrentYearMonth = () => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return { year, month };
};

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const getInlineContentFolder = () => {
  const { year, month } = getCurrentYearMonth();
  const folder = path.join(UPLOADS_ROOT, "project", year, month);
  ensureDirectory(folder);
  return folder;
};

const getAuthorImagesFolder = () => {
  const folder = path.join(UPLOADS_ROOT, "project", "author_images");
  ensureDirectory(folder);
  return folder;
};

const getExtensionFromMimeType = (mimeType) => {
  const lower = (mimeType || "").toLowerCase();

  if (lower === "image/jpeg") return "jpg";
  if (lower === "image/png") return "png";
  if (lower === "image/webp") return "webp";
  if (lower === "image/gif") return "gif";
  if (lower === "image/svg+xml") return "svg";
  if (lower === "image/bmp") return "bmp";

  return "png";
};

const saveDataUriImage = (dataUri, options = {}) => {
  if (!dataUri || typeof dataUri !== "string") return null;

  const trimmed = dataUri.trim();
  const dataUriMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i);

  if (!dataUriMatch) return null;

  const mimeType = dataUriMatch[1];
  const rawBase64 = dataUriMatch[2].replace(/\s/g, "");

  let buffer;
  try {
    buffer = Buffer.from(rawBase64, "base64");
  } catch (error) {
    return null;
  }

  if (!buffer.length) return null;

  const prefix = options.prefix || "image";
  const targetFolder = options.targetFolder || getInlineContentFolder();
  const extension = getExtensionFromMimeType(mimeType);
  const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
  const absolutePath = path.join(targetFolder, fileName);

  fs.writeFileSync(absolutePath, buffer);

  const normalizedAbsolute = absolutePath.replace(/\\/g, "/");
  const uploadsIndex = normalizedAbsolute.indexOf("uploads/");

  if (uploadsIndex === -1) return null;

  return `${BASE_URL}/${normalizedAbsolute.substring(uploadsIndex)}`;
};

const getFirstUploadedFile = (files, keys) => {
  if (!files) return null;

  for (const key of keys) {
    if (files[key]?.[0]) return files[key][0];
  }

  return null;
};

const getFileUrl = (file) => {
  if (!file?.path) return null;

  const normalizedPath = file.path.replace(/\\/g, "/");
  const uploadsIndex = normalizedPath.indexOf("uploads/");

  if (uploadsIndex === -1) return null;

  const filePath = normalizedPath.substring(uploadsIndex);
  return `${BASE_URL}/${filePath}`;
};

const normalizeImageUrl = (value, options = {}) => {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^data:image\//i.test(trimmed)) {
    return saveDataUriImage(trimmed, options) || trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, "/");
  const uploadsIndex = normalized.indexOf("uploads/");

  if (uploadsIndex !== -1) {
    return `${BASE_URL}/${normalized.substring(uploadsIndex)}`;
  }

  if (normalized.startsWith("/uploads/")) {
    return `${BASE_URL}${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${BASE_URL}/${normalized}`;
  }

  return trimmed;
};

const replaceInlineBase64Images = (content) => {
  if (!content || typeof content !== "string") return content;

  const imgSrcRegex = /(<img\b[^>]*\bsrc=["'])(data:image\/[^"']+?)(["'][^>]*>)/gi;

  return content.replace(imgSrcRegex, (match, prefix, srcValue, suffix) => {
    const savedUrl = saveDataUriImage(srcValue, {
      prefix: "content",
      targetFolder: getInlineContentFolder()
    });

    if (!savedUrl) return match;

    return `${prefix}${savedUrl}${suffix}`;
  });
};

// Helper validation functions
const isValidId = (id) => {
  return Number.isInteger(Number(id)) && Number(id) > 0;
};

const isValidSlug = (slug) => {
  return typeof slug === "string" && slug.trim().length > 0;
};

exports.createProject = async (req, res) => {
  try {
    const {
      post_title,
      post_name,
      post_date,
      category_name,
      category_slug,
      post_content,
      author_name,
      author_linkedin,
      author_quote,
      seo_title,
      seoTitle,
      seo_focus_keyword,
      seoFocusKeyword,
      seo_tags,
      seoTags,
      seo_desc,
      seoDesc,
      description
    } = req.body;

    if (!post_title || !post_name || !category_name || !post_content) {
      return res.status(400).json({
        status: 0,
        error: "Required fields missing"
      });
    }

    let featured_image = null;
    let author_image = null;
    let updatedPostContent = post_content;

    if (req.files) {
      const featuredFile = getFirstUploadedFile(req.files, [
        "featured_image",
        "feature_image",
        "featuredImage",
        "featured_image[]",
        "feature_image[]",
        "fetured_image"
      ]);

      if (featuredFile) {
        featured_image = getFileUrl(featuredFile);
      }

      const authorFile = getFirstUploadedFile(req.files, [
        "author_image",
        "authorImage",
        "author_image[]",
        "authorImage[]",
        "author_name_image"
      ]);

      if (authorFile) {
        author_image = getFileUrl(authorFile);
      }

      if (req.files.content_image?.length > 0 && !updatedPostContent.includes("<img")) {
        const firstContentImage = getFileUrl(req.files.content_image[0]);
        if (firstContentImage) {
          updatedPostContent = `<img src="${firstContentImage}" alt="" />\n${updatedPostContent}`;
        }
      }
    }

    updatedPostContent = replaceInlineBase64Images(updatedPostContent);

    if (!featured_image) {
      featured_image = normalizeImageUrl(
        req.body.featured_image ||
        req.body.feature_image ||
        req.body.featuredImage ||
        null,
        {
          prefix: "featured",
          targetFolder: getInlineContentFolder()
        }
      );
    }

    if (!author_image) {
      author_image = normalizeImageUrl(
        req.body.author_image ||
        req.body.authorImage ||
        req.body.author_name_image ||
        null,
        {
          prefix: "author",
          targetFolder: getAuthorImagesFolder()
        }
      );
    }

    const projectData = {
      post_title,
      post_name,
      post_date: post_date || null,
      category_name,
      category_slug: category_slug || null,
      featured_image,
      post_content: updatedPostContent,
      seo_title: seo_title || seoTitle || null,
      seo_desc: description || seo_desc || seoDesc || null,
      description: description || seo_desc || seoDesc || null,
      author_name: author_name || null,
      author_linkedin: author_linkedin || null,
      author_quote: author_quote || null,
      author_image,
      seo_focus_keyword: seo_focus_keyword || seoFocusKeyword || null,
      seo_tags: seo_tags || seoTags || null
    };

    const result = await Project.createProject(projectData);

    res.status(201).json({
      status: 1,
      message: "Project created successfully",
      data: result
    });

  } catch (error) {

    console.error("Create Project Error:", error);

    if (req.files) {
      const removeFile = (file) => {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      };

      req.files.featured_image?.forEach(removeFile);
      req.files.feature_image?.forEach(removeFile);
      req.files.featuredImage?.forEach(removeFile);
      req.files["featured_image[]"]?.forEach(removeFile);
      req.files["feature_image[]"]?.forEach(removeFile);
      req.files.fetured_image?.forEach(removeFile);
      req.files.author_image?.forEach(removeFile);
      req.files.authorImage?.forEach(removeFile);
      req.files["author_image[]"]?.forEach(removeFile);
      req.files["authorImage[]"]?.forEach(removeFile);
      req.files.author_name_image?.forEach(removeFile);
      req.files.content_image?.forEach(removeFile);
    }

    res.status(500).json({
      status: 0,
      error: error.message
    });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        status: 0,
        error: "Invalid Project ID"
      });
    }

    const {
      post_title,
      post_name,
      post_date,
      category_name,
      category_slug,
      post_content,
      author_name,
      author_linkedin,
      author_quote,
      seo_title,
      seoTitle,
      seo_focus_keyword,
      seoFocusKeyword,
      seo_tags,
      seoTags,
      seo_desc,
      seoDesc,
      description
    } = req.body;

    if (!post_title || !post_name || !category_name || !post_content) {
      return res.status(400).json({
        status: 0,
        error: "Required fields missing"
      });
    }

    let featured_image = null;
    let author_image = null;
    let updatedPostContent = post_content;

    if (req.files) {
      const featuredFile = getFirstUploadedFile(req.files, [
        "featured_image",
        "feature_image",
        "featuredImage",
        "featured_image[]",
        "feature_image[]",
        "fetured_image"
      ]);

      if (featuredFile) {
        featured_image = getFileUrl(featuredFile);
      }

      const authorFile = getFirstUploadedFile(req.files, [
        "author_image",
        "authorImage",
        "author_image[]",
        "authorImage[]",
        "author_name_image"
      ]);

      if (authorFile) {
        author_image = getFileUrl(authorFile);
      }

      if (req.files.content_image?.length > 0 && !updatedPostContent.includes("<img")) {
        const firstContentImage = getFileUrl(req.files.content_image[0]);
        if (firstContentImage) {
          updatedPostContent = `<img src="${firstContentImage}" alt="" />\n${updatedPostContent}`;
        }
      }
    }

    updatedPostContent = replaceInlineBase64Images(updatedPostContent);

    if (!featured_image) {
      featured_image = normalizeImageUrl(
        req.body.featured_image ||
        req.body.feature_image ||
        req.body.featuredImage ||
        null,
        {
          prefix: "featured",
          targetFolder: getInlineContentFolder()
        }
      );
    }

    if (!author_image) {
      author_image = normalizeImageUrl(
        req.body.author_image ||
        req.body.authorImage ||
        req.body.author_name_image ||
        null,
        {
          prefix: "author",
          targetFolder: getAuthorImagesFolder()
        }
      );
    }

    const projectData = {
      post_title,
      post_name,
      post_date: post_date || null,
      category_name,
      category_slug: category_slug || null,
      featured_image,
      post_content: updatedPostContent,
      seo_title: seo_title || seoTitle || null,
      seo_desc: description || seo_desc || seoDesc || null,
      description: description || seo_desc || seoDesc || null,
      author_name: author_name || null,
      author_linkedin: author_linkedin || null,
      author_quote: author_quote || null,
      author_image,
      seo_focus_keyword: seo_focus_keyword || seoFocusKeyword || null,
      seo_tags: seo_tags || seoTags || null
    };

    const result = await Project.updateProject(projectId, projectData);

    res.json({
      status: 1,
      message: "Project updated successfully",
      data: result
    });

  } catch (error) {

    console.error("Update Project Error:", error);

    if (req.files) {
      const removeFile = (file) => {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      };

      req.files.featured_image?.forEach(removeFile);
      req.files.feature_image?.forEach(removeFile);
      req.files.featuredImage?.forEach(removeFile);
      req.files["featured_image[]"]?.forEach(removeFile);
      req.files["feature_image[]"]?.forEach(removeFile);
      req.files.fetured_image?.forEach(removeFile);
      req.files.author_image?.forEach(removeFile);
      req.files.authorImage?.forEach(removeFile);
      req.files["author_image[]"]?.forEach(removeFile);
      req.files["authorImage[]"]?.forEach(removeFile);
      req.files.author_name_image?.forEach(removeFile);
      req.files.content_image?.forEach(removeFile);
    }

    if (
      error.message === "Project not found" ||
      error.message === "Project not found or no changes made"
    ) {
      return res.status(404).json({
        status: 0,
        error: error.message
      });
    }

    res.status(500).json({
      status: 0,
      error: error.message
    });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        status: 0,
        error: "Invalid Project ID"
      });
    }

    const result = await Project.deleteProject(projectId);

    res.json({
      status: 1,
      message: "Project deleted successfully",
      data: result
    });

  } catch (error) {
    console.error("Delete Project Error:", error);

    if (error.message === "Project not found") {
      return res.status(404).json({
        status: 0,
        error: error.message
      });
    }

    res.status(500).json({
      status: 0,
      error: error.message
    });
  }
};

exports.likeProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { liked } = req.body;

    if (!isValidId(projectId)) {
      return res.status(400).json({
        status: 0,
        error: "Invalid Project ID"
      });
    }

    if (typeof liked !== "boolean") {
      return res.status(400).json({
        status: 0,
        error: "liked must be true or false"
      });
    }

    const result = await Project.likeProject(projectId, liked);

    res.json({
      status: 1,
      message: "Success",
      likes: result.likes
    });

  } catch (error) {
    console.error("Like Project Error:", error);

    if (error.message === "Project not found") {
      return res.status(404).json({
        status: 0,
        error: error.message
      });
    }

    res.status(500).json({
      status: 0,
      error: error.message
    });
  }
};


// ================= GET ALL =================
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.getAllProjects();

    res.json({
      status: 1,
      count: projects.length,
      data: projects
    });

  } catch (error) {
    res.status(500).json({
      status: 0,
      error: error.message
    });
  }
};


// ================= GET BY ID =================
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (!isValidId(id)) {
      return res.status(400).json({
        status: 0,
        error: "Invalid Project ID"
      });
    }

    const project = await Project.getProjectById(id);

    if (!project) {
      return res.status(404).json({
        status: 0,
        error: "Project not found"
      });
    }

    res.json({
      status: 1,
      data: project
    });

  } catch (error) {
    res.status(500).json({
      status: 0,
      error: error.message
    });
  }
};


// ================= GET BY SLUG =================
// exports.getProjectBySlug = async (req, res) => {
//   try {
//     const { slug } = req.params;

//     // Validation
//     if (!isValidSlug(slug)) {
//       return res.status(400).json({
//         status: 0,
//         error: "Invalid Project Slug"
//       });
//     }

//     const project = await Project.getProjectBySlug(slug);

//     if (!project) {
//       return res.status(404).json({
//         status: 0,
//         error: "Project not found"
//       });
//     }

//     res.json({
//       status: 1,
//       data: project
//     });

//   } catch (error) {
//     res.status(500).json({
//       status: 0,
//       error: error.message
//     });
//   }
// };


// ================= GET BY CATEGORY =================
exports.getProjectsByCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    // Validation
    if (!isValidSlug(slug)) {
      return res.status(400).json({
        status: 0,
        error: "Invalid Category Slug"
      });
    }

    const projects = await Project.getProjectsByCategorySlug(slug);

    if (!projects || projects.length === 0) {
      return res.status(404).json({
        status: 0,
        error: "No projects found"
      });
    }

    res.json({
      status: 1,
      count: projects.length,
      data: projects
    });

  } catch (error) {
    res.status(500).json({
      status: 0,
      error: error.message
    });
  }
};

