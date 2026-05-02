cat > routes/users.js << 'EOF'
const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile/update', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (name) req.user.name = name;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/role', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only global admins can change roles' });
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
EOF