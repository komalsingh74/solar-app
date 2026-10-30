
import mongoose from "mongoose";

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    // Task title
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: 200,
    },

    // Task type
    type: {
      type: String,
      enum: [
        "Call",
        "WhatsApp",
        "Visit",
        "Email",
        "Document collection",
        "Meeting",
        "Other",
      ],
      required: true,
      default: "Call",
    },

    // Task priority
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
      index: true,
    },

    // Linked entity type.
    // These values must match the actual Mongoose model names.
    linkedTo: {
      type: String,
      enum: ["Lead", "Customer", "SolarProject"],
      required: true,
    },

    // Reference to the selected Lead, Customer or SolarProject
    linkedId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "linkedTo",
    },

    // Optional phone snapshot for calling or messaging
    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // Employee responsible for the task
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Due date and time stored together
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Task notes / instructions
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },

    // Optional reminder
    reminder: {
      type: Boolean,
      default: false,
    },

    // Task workflow status
    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // Audit reference
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

// Dashboard / task list queries
taskSchema.index({
  assignedTo: 1,
  status: 1,
  dueDate: 1,
});

taskSchema.index({
  linkedTo: 1,
  linkedId: 1,
});

taskSchema.index({ createdAt: -1 });

const Task =
  mongoose.models.Task ||
  mongoose.model("Task", taskSchema);

export default Task;
