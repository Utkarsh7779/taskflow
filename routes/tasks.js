const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { auth } = require('../middleware/auth');

const router = express.Router();

const checkProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return member ? { project, memberRole: member.role } : null;
};

// GET /api/tasks/dashboard - Dashboard stats for current user
router.get('/dashboard', auth, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id });
    const projectIds = projects.map(p => p._id);
    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate('project', 'name color')
      .populate('assignee', 'name email');

    const now = new Date();
    const myTasks = tasks.filter(t => t.assignee?._id.toString() === req.user._id.toString());

    res.json({
      totalProjects: projects.length,
      totalTasks: tasks.length,
      myTasks: myTasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
      recentTasks: tasks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
      myRecentTasks: myTasks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/tasks?project=id - Get tasks for a project
router.get('/', auth, async (req, res) => {
  try {
    const { project, status, priority, assignee } = req.query;
    if (!project) return res.status(400).json({ message: 'Project ID required' });

    const access = await checkProjectAccess(project, req.user._id);
    if (!access) return res.status(403).json({ message: 'Access denied' });

    const filter = { project };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/tasks
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('project').notEmpty().withMessage('Project ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, project, assignee, status, priority, dueDate, tags } = req.body;

    const access = await checkProjectAccess(project, req.user._id);
    if (!access) return res.status(403).json({ message: 'Access denied' });

    // Validate assignee is a project member
    if (assignee) {
      const isMember = access.project.members.some(m => m.user.toString() === assignee);
      if (!isMember) return res.status(400).json({ message: 'Assignee must be a project member' });
    }

    const task = new Task({
      title, description, project, assignee, status, priority, dueDate, tags,
      createdBy: req.user._id
    });
    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name color');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const access = await checkProjectAccess(task.project._id, req.user._id);
    if (!access) return res.status(403).json({ message: 'Access denied' });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const access = await checkProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ message: 'Access denied' });

    const { title, description, assignee, status, priority, dueDate, tags } = req.body;
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (tags) task.tags = tags;
    if (assignee !== undefined) {
      if (assignee) {
        const isMember = access.project.members.some(m => m.user.toString() === assignee);
        if (!isMember) return res.status(400).json({ message: 'Assignee must be a project member' });
      }
      task.assignee = assignee || null;
    }

    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const access = await checkProjectAccess(task.project, req.user._id);
    if (!access) return res.status(403).json({ message: 'Access denied' });

    // Only admin or creator can delete
    if (access.memberRole !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admins or task creator can delete' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
