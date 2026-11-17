
import mongoose from "mongoose";

const { Schema } = mongoose;

const solarProjectSchema = new Schema(
  {
    // Project identification
    projectCode: {
      type: String,
      required: true,
      trim: true,
    },

    // Customer relationships
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    siteSurvey: {
      type: Schema.Types.ObjectId,
      ref: "SiteSurvey",
      default: null,
    },

    // Installation category
installationType: {
  type: String,
  enum: [
    "Residential Rooftop",
    "Commercial/Industrial",
    "Government/Subsidy",
    "Mixed",
  ],
  required: true,
},

    // Site details
    siteAddress: {
      type: String,
      trim: true,
      required: true,
    },

    systemSizeKw: {
      type: Number,
      min: 0.1,
      required: true,
    },

    // Project progress stage
    stage: {
      type: String,
      enum: [
        "Survey approved",
        "Material dispatched",
        "Structure",
        "Panels mounted",
        "Wiring & inverter",
        "Net-meter & inspection",
        "Commissioned",
      ],
      default: "Survey approved",
    },

    // Overall project status
    status: {
      type: String,
      enum: [
        "Planning",
        "In Progress",
        "On Hold",
        "Completed",
        "Cancelled",
      ],
      default: "Planning",
    },

    // Project team
    engineer: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    engineerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    installationTeam: {
      type: Schema.Types.ObjectId,
      ref: "InstallationTeam",
      default: null,
    },

    // Project schedule
    startDate: {
      type: Date,
      required: true,
    },

    targetDate: {
      type: Date,
      required: true,
    },

    actualCompletionDate: {
      type: Date,
      default: null,
    },

    commissionedAt: {
      type: Date,
      default: null,
    },

    // Payment arrangement
    paymentMode: {
      type: String,
      enum: [
        "Cash",
        "Finance",
        "Installments",
        "Mixed",
      ],
      default: "Cash",
    },

    financeProvider: {
      type: String,
      trim: true,
      default: "",
    },

    financeStatus: {
      type: String,
      enum: [
        "Not Applicable",
        "Pending",
        "Applied",
        "Approved",
        "Rejected",
        "Disbursed",
      ],
      default: "Not Applicable",
    },

    // Net metering
    netMeteringStatus: {
      type: String,
      enum: [
        "Not applied",
        "Applied",
        "Approved",
        "Installed",
      ],
      default: "Not applied",
    },

    // Government subsidy
    subsidyStatus: {
      type: String,
      enum: [
        "Not applicable",
        "Applied",
        "Approved",
        "Received",
      ],
      default: "Not applicable",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Project date validation
solarProjectSchema.pre("validate", function () {
  if (
    this.startDate &&
    this.targetDate &&
    this.targetDate < this.startDate
  ) {
    this.invalidate(
      "targetDate",
      "Target date cannot be before start date"
    );
  }
});

// Unique project code
solarProjectSchema.index(
  { projectCode: 1 },
  { unique: true }
);

// Customer project history
solarProjectSchema.index({
  customer: 1,
  createdAt: -1,
});

// Lead project lookup
solarProjectSchema.index({
  lead: 1,
});

// Site survey lookup
solarProjectSchema.index({
  siteSurvey: 1,
});

// Project dashboard filters
solarProjectSchema.index({
  status: 1,
  stage: 1,
  targetDate: 1,
});

// Engineer project listing
solarProjectSchema.index({
  engineer: 1,
  status: 1,
});

// Installation team projects
solarProjectSchema.index({
  installationTeam: 1,
  status: 1,
});

const SolarProject =
  mongoose.models.SolarProject ||
  mongoose.model("SolarProject", solarProjectSchema);

export default SolarProject;
