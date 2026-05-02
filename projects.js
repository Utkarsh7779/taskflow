const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - Get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id
    }).populate('owner', 'name email').populate('members.user', 'name email');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects - Create project
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, dueDate, color } = req.body;
    const project = new Project({
      name, description, dueDate, color,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });
    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') return res.status(403).json({ message: 'Only project admins can edit' });

    const { name, description, dueDate, color, status } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (dueDate !== undefined) project.dueDate = dueDate;
    if (color) project.color = color;
    if (status) project.status = status;

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('members.user', 'name email');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project owner can delete' });
    }
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/members - Add member
router.post('/:id/members', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') return res.status(403).json({ message: 'Only admins can add members' });

    const { userId, role } = req.body;
    const alreadyMember = project.members.some(m => m.user.toString() === userId);
    if (alreadyMember) return res.status(400).json({ message: 'User already a member' });

    project.members.push({ user: userId, role: role || 'member' });
    await project.save();
    await project.populate('members.user', 'name email');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') return res.status(403).json({ message: 'Only admins can remove members' });

    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/:id/stats
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const tasks = await Task.find({ project: req.params.id });
    const now = new Date();
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
