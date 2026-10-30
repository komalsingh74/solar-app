
import mongoose from "mongoose";

const { Schema } = mongoose;

const photoSchema = new Schema({
  id: { type: String, trim: true, required: true },
  name: { type: String, trim: true, default: "" },
  src: { type: String, required: true },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  source: { type: String, enum: ["exif", "device", "none"], default: "none" },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const activitySchema = new Schema({
  at: { type: Date, default: Date.now },
  text: { type: String, required: true, trim: true },
}, { _id: false });

const siteSurveySchema = new Schema(
  {
    surveyNumber: {
      type: String,
      trim: true,
      default: null,
    },

    // Visit details
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // Optional CRM lead reference
    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    // Optional solar project reference
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

    engineer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    siteAddress: {
      type: String,
      required: [true, "Site address is required"],
      trim: true,
    },

    visitDate: {
      type: Date,
      required: true,
      // index: true,
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
      // index: true,
    },

    // Roof & site details
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

    // Auto assessment
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

    visitTime: {
      type: String,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid visit time"],
      default: "11:00",
    },

    cancelReason: {
      type: String,
      trim: true,
      default: "",
    },

    checklist: {
      type: Map,
      of: Boolean,
      default: {},
    },

    photos: {
      type: [photoSchema],
      default: [],
    },

    activity: {
      type: [activitySchema],
      default: [],
    },

    // Survey completion
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

// Unique survey number across this single-tenant application.
// Multiple null values are allowed for unsaved/generated numbers.
siteSurveySchema.index(
  { surveyNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      surveyNumber: { $type: "string" },
    },
  }
);

// Common filters
siteSurveySchema.index({
  customer: 1,
});

siteSurveySchema.index({
  engineer: 1,
  visitDate: 1,
});

siteSurveySchema.index({ status: 1 });

siteSurveySchema.index({ lead: 1 });

const SiteSurvey =
  mongoose.models.SiteSurvey ||
  mongoose.model("SiteSurvey", siteSurveySchema);

export default SiteSurvey;
