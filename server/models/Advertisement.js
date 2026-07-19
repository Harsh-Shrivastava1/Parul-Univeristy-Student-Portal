const { Schema, model, models } = require('mongoose');

/**
 * advertisements collection — OWNED by the TEC Cell Portal.
 * The Student Portal READS this collection only (browse internships).
 * strict:false preserves the TEC/sibling document shape.
 */
const advertisementSchema = new Schema({}, { versionKey: false, strict: false });

module.exports = models.Advertisement || model('Advertisement', advertisementSchema, 'advertisements');
