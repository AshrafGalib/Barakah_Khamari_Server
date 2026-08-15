const { ObjectId } = require("mongodb");

const { getDB } = require("../config/db");

const PRODUCT_COLLECTION = "products";

// ==========================================
// Helper: Convert Value To Number
// ==========================================

const toNumber = (value, defaultValue = 0) => {
  if (
    value === "" ||
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error("Numeric value সঠিক নয়");
  }

  return number;
};

// ==========================================
// Get All Products
// ==========================================

const getProducts = async () => {
  const db = getDB();

  return await db
    .collection(PRODUCT_COLLECTION)
    .find({})
    .sort({
      createdAt: -1,
    })
    .toArray();
};

// ==========================================
// Get Single Product
// ==========================================

const getProductById = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return await db
    .collection(PRODUCT_COLLECTION)
    .findOne({
      _id: new ObjectId(id),
    });
};

// ==========================================
// Create Product
// ==========================================

const createProduct = async (productData) => {
  const db = getDB();

  const {
    name,
    categoryId,
    categoryName,
    unit,
    brand,
    stockQuantity,
    minimumQuantity,
    stockPieces,
    minimumPieces,
    totalWeight,
    status,
    description,
  } = productData;

  // ========================================
  // Basic Validation
  // ========================================

  if (!name?.trim()) {
    throw new Error("Product-এর নাম আবশ্যক");
  }

  if (!categoryId) {
    throw new Error("Category নির্বাচন করুন");
  }

  if (!ObjectId.isValid(categoryId)) {
    throw new Error("Invalid Category ID");
  }

  if (!unit) {
    throw new Error("Product Unit আবশ্যক");
  }

  // ========================================
  // Product Type
  // ========================================

  const isPoultry = unit === "কেজি + পিস";

  // ========================================
  // Convert Numbers
  // ========================================

  const finalStockQuantity = isPoultry
    ? null
    : toNumber(stockQuantity);

  const finalMinimumQuantity = isPoultry
    ? null
    : toNumber(minimumQuantity);

  const finalStockPieces = isPoultry
    ? toNumber(stockPieces)
    : null;

  const finalMinimumPieces = isPoultry
    ? toNumber(minimumPieces)
    : null;

  const finalTotalWeight = isPoultry
    ? toNumber(totalWeight)
    : null;

  // ========================================
  // Negative Validation
  // ========================================

  if (
    finalStockQuantity !== null &&
    finalStockQuantity < 0
  ) {
    throw new Error(
      "Stock Quantity negative হতে পারবে না"
    );
  }

  if (
    finalMinimumQuantity !== null &&
    finalMinimumQuantity < 0
  ) {
    throw new Error(
      "Minimum Quantity negative হতে পারবে না"
    );
  }

  if (
    finalStockPieces !== null &&
    finalStockPieces < 0
  ) {
    throw new Error(
      "Stock Pieces negative হতে পারবে না"
    );
  }

  if (
    finalMinimumPieces !== null &&
    finalMinimumPieces < 0
  ) {
    throw new Error(
      "Minimum Pieces negative হতে পারবে না"
    );
  }

  if (
    finalTotalWeight !== null &&
    finalTotalWeight < 0
  ) {
    throw new Error(
      "Total Weight negative হতে পারবে না"
    );
  }

  // ========================================
  // Check Category
  // ========================================

  const category = await db
    .collection("categories")
    .findOne({
      _id: new ObjectId(categoryId),
    });

  if (!category) {
    throw new Error("Category পাওয়া যায়নি");
  }

  // ========================================
  // Create Product
  // ========================================

  const now = new Date();

  const product = {
    name: name.trim(),

    categoryId: new ObjectId(categoryId),

    categoryName:
      categoryName?.trim() ||
      category.name ||
      "",

    unit,

    brand: brand?.trim() || "",

    // Normal Product
    stockQuantity: finalStockQuantity,

    minimumQuantity: finalMinimumQuantity,

    // Poultry Product
    stockPieces: finalStockPieces,

    minimumPieces: finalMinimumPieces,

    totalWeight: finalTotalWeight,

    status: status || "সক্রিয়",

    description: description?.trim() || "",

    createdAt: now,

    updatedAt: now,
  };

  const result = await db
    .collection(PRODUCT_COLLECTION)
    .insertOne(product);

  return {
    _id: result.insertedId,
    ...product,
  };
};

// ==========================================
// Update Product
// ==========================================

const updateProduct = async (
  id,
  productData
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid Product ID");
  }

  const {
    name,
    categoryId,
    categoryName,
    unit,
    brand,
    stockQuantity,
    minimumQuantity,
    stockPieces,
    minimumPieces,
    totalWeight,
    status,
    description,
  } = productData;

  // ========================================
  // Validation
  // ========================================

  if (!name?.trim()) {
    throw new Error("Product-এর নাম আবশ্যক");
  }

  if (!categoryId) {
    throw new Error("Category নির্বাচন করুন");
  }

  if (!ObjectId.isValid(categoryId)) {
    throw new Error("Invalid Category ID");
  }

  if (!unit) {
    throw new Error("Product Unit আবশ্যক");
  }

  // ========================================
  // Check Product
  // ========================================

  const existingProduct = await db
    .collection(PRODUCT_COLLECTION)
    .findOne({
      _id: new ObjectId(id),
    });

  if (!existingProduct) {
    return null;
  }

  // ========================================
  // Check Category
  // ========================================

  const category = await db
    .collection("categories")
    .findOne({
      _id: new ObjectId(categoryId),
    });

  if (!category) {
    throw new Error("Category পাওয়া যায়নি");
  }

  // ========================================
  // Product Type
  // ========================================

  const isPoultry = unit === "কেজি + পিস";

  // ========================================
  // Important:
  // Existing stock কে preserve করার জন্য
  // Update করার সময় নতুন stock values
  // explicitly পাঠানো হলে সেটাই ব্যবহার হবে।
  // ========================================

  const finalStockQuantity = isPoultry
    ? null
    : toNumber(stockQuantity);

  const finalMinimumQuantity = isPoultry
    ? null
    : toNumber(minimumQuantity);

  const finalStockPieces = isPoultry
    ? toNumber(stockPieces)
    : null;

  const finalMinimumPieces = isPoultry
    ? toNumber(minimumPieces)
    : null;

  const finalTotalWeight = isPoultry
    ? toNumber(totalWeight)
    : null;

  // ========================================
  // Negative Validation
  // ========================================

  if (
    finalStockQuantity !== null &&
    finalStockQuantity < 0
  ) {
    throw new Error(
      "Stock Quantity negative হতে পারবে না"
    );
  }

  if (
    finalMinimumQuantity !== null &&
    finalMinimumQuantity < 0
  ) {
    throw new Error(
      "Minimum Quantity negative হতে পারবে না"
    );
  }

  if (
    finalStockPieces !== null &&
    finalStockPieces < 0
  ) {
    throw new Error(
      "Stock Pieces negative হতে পারবে না"
    );
  }

  if (
    finalMinimumPieces !== null &&
    finalMinimumPieces < 0
  ) {
    throw new Error(
      "Minimum Pieces negative হতে পারবে না"
    );
  }

  if (
    finalTotalWeight !== null &&
    finalTotalWeight < 0
  ) {
    throw new Error(
      "Total Weight negative হতে পারবে না"
    );
  }

  // ========================================
  // Update
  // ========================================

  const updateData = {
    name: name.trim(),

    categoryId: new ObjectId(categoryId),

    categoryName:
      categoryName?.trim() ||
      category.name ||
      "",

    unit,

    brand: brand?.trim() || "",

    stockQuantity: finalStockQuantity,

    minimumQuantity: finalMinimumQuantity,

    stockPieces: finalStockPieces,

    minimumPieces: finalMinimumPieces,

    totalWeight: finalTotalWeight,

    status: status || "সক্রিয়",

    description: description?.trim() || "",

    updatedAt: new Date(),
  };

  await db
    .collection(PRODUCT_COLLECTION)
    .updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      }
    );

  return await db
    .collection(PRODUCT_COLLECTION)
    .findOne({
      _id: new ObjectId(id),
    });
};

// ==========================================
// Delete Product
// ==========================================

const deleteProduct = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const result = await db
    .collection(PRODUCT_COLLECTION)
    .deleteOne({
      _id: new ObjectId(id),
    });

  return result.deletedCount > 0;
};

// ==========================================
// Export
// ==========================================

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};