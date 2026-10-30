import mongoose from "mongoose";

const productCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

productCategorySchema.index({ categoryName: 1 }, { unique: true });

const ProductCategory =
  mongoose.models.ProductCategory ||
  mongoose.model("ProductCategory", productCategorySchema);

export default ProductCategory;
