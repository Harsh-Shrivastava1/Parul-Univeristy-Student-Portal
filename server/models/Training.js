const { Schema, model, models } = require('mongoose');

/**
 * trainings collection — OWNED by the Coordinator Portal.
 * The Student Portal READS its own training record only (read-only).
 * strict:false preserves the coordinator/sibling document shape.
 */
const trainingSchema = new Schema({}, { versionKey: false, strict: false });

module.exports = models.Training || model('Training', trainingSchema, 'trainings');
