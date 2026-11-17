
import mongoose from "mongoose";

const { Schema } = mongoose;

// Site survey photos
const photoSchema = new Schema(
  {
    id: {
      type: String,
      trim: true,
      required: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    // Store Cloudinary / S3 URL
    src: {
      type: String,
      required: true,
      trim: true,
    },

    lat: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },

    lng: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },

    source: {
      type: String,
      enum: ["exif", "device", "none"],
      default: "none",
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Survey activity history
const activitySchema = new Schema(
  {
    at: {
      type: Date,
      default: Date.now,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const siteSurveySchema = new Schema(
  {
    surveyNumber: {
      type: String,
      trim: true,
      default: null,
    },

    // Customer / Lead / Project references
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "SolarProject",
      default: null,
    },

    phone: {
      type: String,
      required: [true, "Customer phone is required"],
      trim: true,
    },

    // Assigned survey engineer
    engineer: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    engineerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    siteAddress: {
      type: String,
      required: [true, "Site address is required"],
      trim: true,
    },

    visitDate: {
      type: Date,
      required: true,
    },

    visitTime: {
      type: String,
      match: [
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Enter a valid visit time",
      ],
      default: "11:00",
    },

    status: {
      type: String,
      enum: [
        "Scheduled",
        "In Progress",
        "Completed",
        "Cancelled",
        "Rescheduled",
      ],
      default: "Scheduled",
    },

    // Roof and site details
    roofType: {
      type: String,
      enum: [
        "RCC",
        "Metal Sheet",
        "Tiled",
        "Asbestos",
        "Ground Mount",
        "Other",
      ],
      default: "RCC",
    },

    shadowFreeAreaSqFt: {
      type: Number,
      min: 0,
      default: null,
    },

    shadowOnRoof: {
      type: String,
      enum: ["None", "Partial", "Heavy"],
      default: "None",
    },

    siteNotes: {
      type: String,
      trim: true,
      default: "",
    },

    // Electrical details
    sanctionedLoadKw: {
      type: Number,
      min: 0,
      default: null,
    },

    connection: {
      type: String,
      enum: ["Single phase", "Three phase"],
      default: "Single phase",
    },

    averageMonthlyUnitsKwh: {
      type: Number,
      min: 0,
      default: null,
    },

    // Assessment details
    assessmentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Needs Review"],
      default: "Pending",
    },

    recommendedCapacityKw: {
      type: Number,
      min: 0,
      default: null,
    },

    assessmentNotes: {
      type: String,
      trim: true,
      default: "",
    },

    cancelReason: {
      type: String,
      trim: true,
      default: "",
    },

    // Dynamic survey checklist
    checklist: {
      type: Map,
      of: Boolean,
      default: {},
    },

    // Survey photos
    photos: {
      type: [photoSchema],
      default: [],
    },

    // Activity history
    activity: {
      type: [activitySchema],
      default: [],
    },

    completedAt: {
      type: Date,
      default: null,
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

// At least one CRM reference is required
siteSurveySchema.pre("validate", function () {
  if (!this.customer && !this.lead) {
    this.invalidate(
      "customer",
      "A customer or lead reference is required"
    );
  }
});

// Unique survey number
siteSurveySchema.index(
  { surveyNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      surveyNumber: { $type: "string" },
    },
  }
);

// Engineer schedule and task listing
siteSurveySchema.index({
  engineer: 1,
  status: 1,
  visitDate: 1,
});

// Customer survey history
siteSurveySchema.index({
  customer: 1,
  visitDate: -1,
});

// Lead survey history
siteSurveySchema.index({
  lead: 1,
  visitDate: -1,
});

// Project survey history
siteSurveySchema.index({
  project: 1,
  visitDate: -1,
});

// Status-based survey listing
siteSurveySchema.index({
  status: 1,
  visitDate: 1,
});

const SiteSurvey =
  mongoose.models.SiteSurvey ||
  mongoose.model("SiteSurvey", siteSurveySchema);

export default SiteSurvey;
