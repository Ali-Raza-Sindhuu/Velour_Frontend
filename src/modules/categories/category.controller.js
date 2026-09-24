import { CategoryService } from "./category.service.js";
import { sendSuccess, sendCreated } from "../../utils/response.js";

export class CategoryController {
  static async getAll(req, res, next) {
    try {
      const categories = await CategoryService.getAllCategories();
      return sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { name, slug, description } = req.body;
      const category = await CategoryService.createCategory({ name, slug, description });
      
      // Sending raw insertId backwards compatibility if needed (sendCreated formatter handles it if we pass insertId)
      // Actually we just pass the object and the formatter will do the right thing if we pass `insertId`, 
      // but let's just mimic `{ success: true, id: X }` by passing { insertId: category.id }
      return sendCreated(res, { insertId: category.id });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { name, slug, description } = req.body;
      await CategoryService.updateCategory(req.params.id, { name, slug, description });
      return sendSuccess(res, null, "Category updated successfully");
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      await CategoryService.deleteCategory(req.params.id);
      return sendSuccess(res, null, "Category deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}
