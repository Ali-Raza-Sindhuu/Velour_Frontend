import { CmsService } from "./cms.service.js";

export class CmsController {
  // Generic image upload for any CMS section field (hero background, banner, etc).
  // Returns just the URL — the editor decides which formData key to store it under.
  static async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file provided" });
      }
      res.json({ success: true, data: { image_url: `/uploads/${req.file.filename}` } });
    } catch (err) { next(err); }
  }

  // NOTE: kept the original response shape (a bare array, not { success, data })
  // since the admin Website Editor / storefront already consume it this way.
  static async getPages(req, res, next) {
    try {
      const data = await CmsService.getPages();
      return res.json(data);
    } catch (err) { next(err); }
  }

  static async reorderSections(req, res, next) {
    try {
      await CmsService.reorderSections(req.params.pageId, req.body.sections);
      return res.json({ success: true, message: "Sections reordered successfully" });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }

  static async updateSection(req, res, next) {
    try {
      const content = await CmsService.updateSection(req.params.pageId, req.params.sectionId, req.body.content);
      return res.json({ success: true, message: "Section updated successfully", content });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: err.message });
    }
  }
}
