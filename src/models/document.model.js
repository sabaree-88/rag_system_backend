import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },

    // embeddings are stored as arrays of numbers
    embedding: {
      type: [Number],
      required: true,
    },

    source: {
      type: String,
    },

    category: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  },
);

// export the model so callers can create/save documents in the usual way
const Document = mongoose.model("Document", documentSchema);

export default Document;
