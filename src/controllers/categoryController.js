const categoryService = require("../services/categoryService");

const getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getCategories();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ক্যাটাগরি লোড করা যায়নি",
      error: error.message,
    });
  }
};

const getCategory = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(
      req.params.id
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "ক্যাটাগরি পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ক্যাটাগরি লোড করা যায়নি",
      error: error.message,
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "ক্যাটাগরির নাম আবশ্যক",
      });
    }

    const category =
      await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      message: "ক্যাটাগরি সফলভাবে যোগ হয়েছে",
      data: category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "ক্যাটাগরির নাম আবশ্যক",
      });
    }

    const category =
      await categoryService.updateCategory(
        req.params.id,
        req.body
      );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "ক্যাটাগরি পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message: "ক্যাটাগরি সফলভাবে পরিবর্তন হয়েছে",
      data: category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const deleted =
      await categoryService.deleteCategory(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "ক্যাটাগরি পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message: "ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ক্যাটাগরি মুছে ফেলা যায়নি",
      error: error.message,
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};