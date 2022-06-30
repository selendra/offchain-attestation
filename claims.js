const { model, Schema } = require("mongoose");

module.exports = model(
  "CLAIM",
  new Schema(
    {
      ctypeId: {
        type: Number,
        required: true,
        min: 0,
      },
      to: {
        type: String,
        required: true,
      },
      attester: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      propertyURI: {
        type: String,
        required: true,
      },
      propertyHash: {
        type: String,
        required: true,
      },
    },
    {
      toObject: { virtuals: true },
      toJSON: { virtuals: true },
    }
  )
);
