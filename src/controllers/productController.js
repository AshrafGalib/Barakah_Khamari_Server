const productService = require("../services/productService");

const getProducts = async (req, res) => {
  try {
    const products =
      await productService.getProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Product লোড করা যায়নি",
      error: error.message,
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const product =
      await productService.getProductById(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Product লোড করা যায়নি",
      error: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product-এর নাম আবশ্যক",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category নির্বাচন করা আবশ্যক",
      });
    }

    const product =
      await productService.createProduct(
        req.body
      );

    res.status(201).json({
      success: true,
      message: "Product সফলভাবে যোগ হয়েছে",
      data: product,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product-এর নাম আবশ্যক",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category নির্বাচন করা আবশ্যক",
      });
    }

    const product =
      await productService.updateProduct(
        req.params.id,
        req.body
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product সফলভাবে পরিবর্তন হয়েছে",
      data: product,
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const deleted =
      await productService.deleteProduct(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product সফলভাবে মুছে ফেলা হয়েছে",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Product মুছে ফেলা যায়নি",
      error: error.message,
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};