
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "SuperAdmin",
        "Admin",
        "HR",
        "SalesExecutive",
        "Accountant",
        "WarehouseManager",
        "PurchaseManager",
        "ProjectManager",
        "InstallationTeam",
        "ServiceEngineer",
        "Employee",
      ],
      default: "Employee",
      required: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    permissions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },

    lastLoginAt: {
      type: Date,
      default: null,
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
  {
    timestamps: true,
    versionKey: false,
  }
);

// Automatically hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// Compare login password with stored hash
userSchema.methods.comparePassword = async function (
  enteredPassword
) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;
