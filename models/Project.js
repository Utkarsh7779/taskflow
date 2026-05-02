cat > models/Project.js << 'EOF'
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: '#6366f1' },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  dueDate: Date,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['admin', 'member'], default: 'member' } }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
EOF