const pool = require("../../config/database");
const he = require("he");

const toMySqlDateTime = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 19).replace("T", " ");
};

class Tutorial {

  static mapRow(row) {
    const cleanedContent = this.cleanContent(row.post_content);

    return {
      ID: row.ID,
      post_title: he.decode(row.post_title),
      post_name: row.post_name,
      post_date: row.post_date,
      post_content: cleanedContent,
      featured_image: row.featured_image
        ? row.featured_image.replace(
            "tutorial/wp-content/uploads",
            "uploads/tutorial"
          )
        : null,
      category_name: row.category_name
        ? he.decode(row.category_name)
        : null,
      category_slug: row.category_slug || null,
      seo_title: row.seo_title || null,
      seo_desc: row.seo_desc || null,
      description: row.seo_desc || null,
      author_name: row.author_name || null,
      author_linkedin: row.author_linkedin || null,
      author_quote: row.author_quote || null,
      author_image: row.author_image || null,
      seo_focus_keyword: row.seo_focus_keyword || null,
      seo_tags: row.seo_tags || null,
      excerpt: this.createExcerpt(cleanedContent)
    };
  }

  //  Clean WordPress Content
  static cleanContent(content) {
    if (!content) return null;

    let cleaned = content
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\\u003C/g, "<")
      .replace(/\\u003E/g, ">")
      .replace(/\n/g, "");

    // Fix image path inside content
    cleaned = cleaned.replace(
      /https:\/\/prephq\.theiotacademy\.co\/tutorial\/wp-content\/uploads/g,
      "https://prephq.theiotacademy.co/uploads/tutorial"
    );

    return he.decode(cleaned);
  }

  //  Create Excerpt
  static createExcerpt(content, length = 160) {
    if (!content) return null;
    const plainText = content.replace(/<[^>]+>/g, "");
    return plainText.substring(0, length) + "...";
  }

  //  GET ALL TUTORIALS
  static async getAllTutorials() {
    try {
      const [rows] = await pool.query(`
        SELECT 
          ID,
          post_title,
          post_content,
          post_name,
          post_date,
          featured_image,
          category_name,
          category_slug,
          seoTitle AS seo_title,
          seo_desc,
          author_name,
          author_linkedin,
          author_quote,
          author_image,
          seo_Focus_Keyword AS seo_focus_keyword,
          seo_Tags AS seo_tags
        FROM tutorial
        WHERE post_type = 'post'
        AND post_status = 'publish'
        ORDER BY post_date DESC
      `);

      return rows.map((row) => this.mapRow(row));

    } catch (error) {
      console.error("Error fetching tutorials:", error.message);
      throw new Error("Failed to fetch tutorials");
    }
  }

  //  GET TUTORIAL BY ID
  static async getTutorialById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT 
          ID,
          post_title,
          post_content,
          post_name,
          post_date,
          featured_image,
          category_name,
          category_slug,
          seoTitle AS seo_title,
          seo_desc,
          author_name,
          author_linkedin,
          author_quote,
          author_image,
          seo_Focus_Keyword AS seo_focus_keyword,
          seo_Tags AS seo_tags
        FROM tutorial
        WHERE ID = ?
        AND post_type = 'post'
        AND post_status = 'publish'
      `, [id]);

      if (!rows.length) return null;

      return this.mapRow(rows[0]);

    } catch (error) {
      console.error("Error fetching tutorial by ID:", error.message);
      throw new Error("Failed to fetch tutorial");
    }
  }

  //  GET TUTORIALS BY CATEGORY SLUG 
  static async getTutorialsByCategorySlug(slug) {
    try {
      const [rows] = await pool.query(`
        SELECT 
          ID,
          post_title,
          post_content,
          post_name,
          post_date,
          featured_image,
          category_name,
          category_slug,
          seoTitle AS seo_title,
          seo_desc,
          author_name,
          author_linkedin,
          author_quote,
          author_image,
          seo_Focus_Keyword AS seo_focus_keyword,
          seo_Tags AS seo_tags
        FROM tutorial
        WHERE FIND_IN_SET(?, category_slug)
        AND post_type = 'post'
        AND post_status = 'publish'
        ORDER BY post_date DESC
      `, [slug]);

      return rows.map((row) => this.mapRow(row));

    } catch (error) {
      console.error("Error fetching tutorials by category:", error.message);
      throw new Error("Failed to fetch tutorials by category");
    }
  }

  //  CREATE TUTORIAL
  static async createTutorial(tutorialData) {
    try {
      const {
        post_title,
        post_name,
        post_date,
        category_name,
        category_slug,
        featured_image,
        post_content,
        author_name,
        author_quote,
        author_linkedin,
        seo_title,
        seo_focus_keyword,
        seo_tags,
        seo_desc,
        author_image
      } = tutorialData;

      const nowMySql = toMySqlDateTime();
      const postDateMySql = toMySqlDateTime(post_date) || nowMySql;
      const query = `
        INSERT INTO tutorial (
          post_author,
          post_date,
          post_date_gmt,
          post_content,
          post_title,
          post_excerpt,
          post_status,
          comment_status,
          ping_status,
          post_password,
          post_name,
          to_ping,
          pinged,
          post_modified,
          post_modified_gmt,
          post_content_filtered,
          post_parent,
          guid,
          menu_order,
          post_type,
          post_mime_type,
          comment_count,
          featured_image,
          category_name,
          category_slug,
          seoTitle,
          seo_desc,
          author_name,
          author_linkedin,
          author_quote,
          author_image,
          seo_Focus_Keyword,
          seo_Tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await pool.query(query, [
        1,
        postDateMySql,
        postDateMySql,
        post_content,
        post_title,
        '',
        'publish',
        'open',
        'open',
        '',
        post_name,
        '',
        '',
        nowMySql,
        nowMySql,
        post_content,
        0,
        '',
        0,
        'post',
        '',
        0,
        featured_image || null,
        category_name,
        category_slug || null,
        seo_title || null,
        seo_desc || null,
        author_name || null,
        author_linkedin || null,
        author_quote || null,
        author_image || null,
        seo_focus_keyword || null,
        seo_tags || null
      ]);

      return {
        ID: result.insertId,
        post_title,
        post_name,
        category_name,
        category_slug,
        featured_image,
        post_content,
        author_name,
        author_quote,
        author_linkedin,
        seo_title,
        seo_focus_keyword,
        seo_tags,
        seo_desc,
        description: seo_desc,
        author_image,
        post_date: postDateMySql,
        message: 'Tutorial created successfully'
      };

    } catch (error) {
      console.error('Error creating tutorial:', error.message);
      throw new Error('Failed to create tutorial');
    }
  }
  //  UPDATE TUTORIAL
  static async updateTutorial(id, tutorialData) {
    try {
      const {
        post_title,
        post_name,
        post_date,
        category_name,
        category_slug,
        featured_image,
        post_content,
        author_name,
        author_quote,
        author_linkedin,
        seo_title,
        seo_focus_keyword,
        seo_tags,
        seo_desc,
        author_image
      } = tutorialData;

      const nowMySql = toMySqlDateTime();
      const postDateMySql = post_date ? toMySqlDateTime(post_date) : null;

      const query = `
        UPDATE tutorial SET
          post_title = ?,
          post_name = ?,
          post_date = COALESCE(?, post_date),
          post_content = ?,
          post_modified = ?,
          post_modified_gmt = ?,
          featured_image = COALESCE(?, featured_image),
          category_name = ?,
          category_slug = COALESCE(?, category_slug),
          seoTitle = COALESCE(?, seoTitle),
          seo_desc = COALESCE(?, seo_desc),
          author_name = COALESCE(?, author_name),
          author_linkedin = COALESCE(?, author_linkedin),
          author_quote = COALESCE(?, author_quote),
          author_image = COALESCE(?, author_image),
          seo_Focus_Keyword = COALESCE(?, seo_Focus_Keyword),
          seo_Tags = COALESCE(?, seo_Tags)
        WHERE ID = ?
        AND post_type = 'post'
      `;

      const [result] = await pool.query(query, [
        post_title,
        post_name,
        postDateMySql,
        post_content,
        nowMySql,
        nowMySql,
        featured_image,
        category_name,
        category_slug,
        seo_title,
        seo_desc,
        author_name,
        author_linkedin,
        author_quote,
        author_image,
        seo_focus_keyword,
        seo_tags,
        id
      ]);

      if (result.affectedRows === 0) {
        throw new Error('Tutorial not found or no changes made');
      }

      return {
        ID: id,
        post_title,
        post_name,
        category_name,
        category_slug,
        featured_image,
        post_content,
        author_name,
        author_quote,
        author_linkedin,
        seo_title,
        seo_focus_keyword,
        seo_tags,
        seo_desc,
        description: seo_desc,
        author_image,
        message: 'Tutorial updated successfully'
      };

    } catch (error) {
      console.error('Error updating tutorial:', error.message);

      if (error.message === 'Tutorial not found or no changes made') {
        throw error;
      }

      throw new Error('Failed to update tutorial');
    }
  }
  static async likeTutorial(id, liked) {
    try {
      const query = `
        UPDATE tutorial SET
          likes = CASE
            WHEN ? THEN COALESCE(likes, 0) + 1
            ELSE GREATEST(COALESCE(likes, 0) - 1, 0)
          END
        WHERE ID = ?
        AND post_type = 'post'
      `;

      await pool.query(query, [liked, id]);

      const [rows] = await pool.query(`
        SELECT likes
        FROM tutorial
        WHERE ID = ?
        AND post_type = 'post'
      `, [id]);

      if (!rows.length) {
        throw new Error('Tutorial not found');
      }

      return {
        likes: rows[0].likes || 0
      };

    } catch (error) {
      console.error('Error updating tutorial likes:', error.message);
      throw error;
    }
  }

  //  DELETE TUTORIAL
  static async deleteTutorial(id) {
    try {
      const query = `
        DELETE FROM tutorial
        WHERE ID = ?
        AND post_type = 'post'
      `;

      const [result] = await pool.query(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Tutorial not found');
      }

      return {
        ID: id,
        message: 'Tutorial deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting tutorial:', error.message);
      throw error;
    }
  }

  //  UPDATE TUTORIAL
 

}

module.exports = Tutorial;
