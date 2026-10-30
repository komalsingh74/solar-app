import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
      maxlength: [100, "Location name cannot exceed 100 characters"],
    },

    type: {
      type: String,
      required: true,
      enum: [
        "Main warehouse",
        "Office stock",
        "Site stock",
        "Factory",
        "Branch warehouse",
      ],
      default: "Main warehouse",
    },

    rackZone: {
      type: String,
      trim: true,
      maxlength: [100, "Rack / zone cannot exceed 100 characters"],
      default: "",
    },

    inCharge: {
      type: String,
      trim: true,
      maxlength: [100, "In-charge name cannot exceed 100 characters"],
      default: "",
    },

    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address cannot exceed 300 characters"],
      default: "",
    },

    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Warehouse = mongoose.model("Warehouse", warehouseSchema);

export default Warehouse;
