const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    data: {},
    email: String,
    experimentId: String,
    updatedAt: {
        type: Date,
        required: true,
        default: Date.now
}
});

module.exports = mongoose.model("Data", dataSchema);