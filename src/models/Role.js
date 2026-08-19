const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    permissions: [
      {
        type: String, // e.g., ["products.view", "sales.create"]
      },
    ],
    isSystemRole: {
      type: Boolean,
      default: false, // Admin এর জন্য true থাকবে যেন কেউ Delete না করতে পারে
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);v