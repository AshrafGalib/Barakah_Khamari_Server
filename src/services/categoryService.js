const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const COLLECTION_NAME = "categories";

// সব Category
const getCategories = async () => {
  const db = getDB();

  return await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
};

// একটি Category
const getCategoryById = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return await db.collection(COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
  });
};

// Category তৈরি
const createCategory = async (categoryData) => {
  const db = getDB();

  const name = categoryData.name?.trim();

  if (!name) {
    throw new Error("ক্যাটাগরির নাম আবশ্যক");
  }

  // একই নাম আছে কিনা
  const existingCategory = await db
    .collection(COLLECTION_NAME)
    .findOne({
      name,
    });

  if (existingCategory) {
    throw new Error(
      "এই নামে একটি ক্যাটাগরি ইতিমধ্যে আছে"
    );
  }

  const category = {
    name,
    description:
      categoryData.description?.trim() || "",
    unit: categoryData.unit || "পিস",
    status: categoryData.status || "সক্রিয়",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db
    .collection(COLLECTION_NAME)
    .insertOne(category);

  return {
    _id: result.insertedId,
    ...category,
  };
};

// Category Update
const updateCategory = async (id, categoryData) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const name = categoryData.name?.trim();

  if (!name) {
    throw new Error("ক্যাটাগরির নাম আবশ্যক");
  }

  // অন্য কোনো Category-তে একই নাম আছে কিনা
  const existingCategory = await db
    .collection(COLLECTION_NAME)
    .findOne({
      name,
      _id: {
        $ne: new ObjectId(id),
      },
    });

  if (existingCategory) {
    throw new Error(
      "এই নামে একটি ক্যাটাগরি ইতিমধ্যে আছে"
    );
  }

  const updatedCategory = {
    name,
    description:
      categoryData.description?.trim() || "",
    unit: categoryData.unit || "পিস",
    status: categoryData.status || "সক্রিয়",
    updatedAt: new Date(),
  };

  const result = await db
    .collection(COLLECTION_NAME)
    .updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updatedCategory,
      }
    );

  if (result.matchedCount === 0) {
    return null;
  }

  return await getCategoryById(id);
};

// Category Delete
const deleteCategory = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const result = await db
    .collection(COLLECTION_NAME)
    .deleteOne({
      _id: new ObjectId(id),
    });

  return result.deletedCount > 0;
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};