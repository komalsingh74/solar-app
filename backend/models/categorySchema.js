
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },

    group: {
      type: String,
      required: [true, "Category group is required"],
      trim: true,
      maxlength: [100, "Group cannot exceed 100 characters"],
      default: "Project",
    },

    monthlyBudget: {
      type: Number,
      min: [0, "Monthly budget cannot be negative"],
      default: 0,
    },

    receiptRequired: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent duplicate category names within the same group
categorySchema.index(
  { categoryName: 1, group: 1 },
  { unique: true }
);

const Category =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema);

export default Category;
