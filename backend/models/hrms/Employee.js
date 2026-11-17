
import mongoose from "mongoose";
import { nextEmployeeCode } from "../../services/employeeCode.js";

const employeeSchema = new mongoose.Schema(
  {
    // ==============================
    // PERSONAL DETAILS
    // ==============================

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    pan: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    uan: {
      type: String,
      trim: true,
      default: "",
    },

    // ==============================
    // JOB DETAILS
    // ==============================

    employeeCode: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },

    department: {
      type: String,
      trim: true,
      enum: [
        "Sales",
        "Installation",
        "Service",
        "Purchase",
        "Accounts",
        "HR",
        "Management",
        "Other",
      ],
      default: "Other",
    },

    designation: {
      type: String,
      trim: true,
      default: "",
    },

    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Temporary"],
      default: "Full-time",
    },

    reportsTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    reportsToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    shift: {
      type: String,
      enum: ["General", "Morning", "Evening", "Night"],
      default: "General",
    },

    systemRole: {
      type: String,
      trim: true,
      default: "Employee",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Resigned", "Terminated"],
      default: "Active",
    },

    electricianLicenseExpiry: {
      type: Date,
      default: null,
    },

    heightSafetyTrainingExpiry: {
      type: Date,
      default: null,
    },

    // ==============================
    // PAYROLL & BANK DETAILS
    // ==============================

    salaryStructure: {
      type: String,
      enum: ["Staff", "Worker", "Contract"],
      default: "Staff",
    },

    monthlyGrossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },

    ifsc: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

  },
  {
    timestamps: true,
  }
);


// ==============================
// Allocate before validation so the required code exists before persistence.
employeeSchema.pre("validate", async function () {
  if (this.isNew && !this.employeeCode) {
    this.employeeCode = await nextEmployeeCode(this.constructor);
  }
});


// ==============================
// INDEXES
// ==============================

employeeSchema.index({ employeeCode: 1 }, { unique: true });

employeeSchema.index({ status: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ fullName: 1 });

const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

export default Employee;
