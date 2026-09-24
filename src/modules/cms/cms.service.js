import pool from "../../config/db.js";

export class CmsService {
  static async getPages() {
    const [pages] = await pool.query("SELECT * FROM cms_pages ORDER BY id ASC");
    const [sections] = await pool.query("SELECT * FROM cms_sections ORDER BY sort_order ASC");

    return pages.map((page) => ({
      id: page.id,
      name: page.name,
      sections: sections
        .filter((s) => s.page_id === page.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          content: typeof s.content === "string" ? JSON.parse(s.content) : s.content,
          sort_order: s.sort_order,
        })),
    }));
  }

  static async reorderSections(pageId, sections) {
    if (!sections || !Array.isArray(sections)) {
      const err = new Error("Valid sections array required");
      err.status = 400;
      throw err;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const section of sections) {
        await connection.query(
          "UPDATE cms_sections SET sort_order = ? WHERE id = ? AND page_id = ?",
          [section.sort_order, section.id, pageId]
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async updateSection(pageId, sectionId, content) {
    if (!content) {
      const err = new Error("Content is required");
      err.status = 400;
      throw err;
    }

    const [rows] = await pool.query(
      "SELECT id FROM cms_sections WHERE id = ? AND page_id = ?",
      [sectionId, pageId]
    );
    if (rows.length === 0) {
      const err = new Error("Section not found");
      err.status = 404;
      throw err;
    }

    await pool.query(
      "UPDATE cms_sections SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND page_id = ?",
      [JSON.stringify(content), sectionId, pageId]
    );

    return content;
  }
}
