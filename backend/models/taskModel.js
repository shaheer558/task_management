const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  estimatedHours: { type: Number, required: true },
  actualHours: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Approved'], default: 'Pending' },
  pauseInterval: { type: Number, default: 0 }, // Tracks the total paused hours
  pauseTime: { type: Date }, // Tracks when task status changed to 'Paused'
  startTime: { type: Date }, // Tracks when task status changed to 'In Progress'
  assignedTo: { type: String, required: true }, // Ensure assignedTo is a string (email)
  assignedBy: { type: String, required: true }, // Ensure assignedBy is a string (email)
  emailSent: { type: Boolean, default: false }, // Tracks if email has been sent for this task
  priority: {type: String, enum: ['High', 'Medium', 'Low' ], required: true}
},
{ timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Create a compound index on title and assignedTo (prevent duplicate titles for the same user)
TaskSchema.index({ title: 1, assignedTo: 1 }, { unique: true }, (error) => {
  if (error) {
    console.error('Error creating index on title and assignedTo:', error);
    return error;
  }
});

//used to synchronize indexes. (if not then previous indexes will still remain until manually removed)
// (async () => {
//   try {
//     // Synchronize indexes
//     const result = await Task.syncIndexes();
//     console.log('Indexes synchronized:', result);
//   } catch (error) {
//     console.error('Error synchronizing indexes:', error);
//   } finally {
//     mongoose.connection.close();
//   }
// })();

module.exports = mongoose.model('Task', TaskSchema);
