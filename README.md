# TaskFlow — Project Management App

A full-stack project & task management web app with role-based access control.

## 🚀 Live Demo
- **Frontend:** *(your Netlify/Vercel URL)*
- **Backend API:** *(your Railway URL)*

## ✨ Features
- **Authentication** — JWT-based signup/login with role selection (Admin/Member)
- **Projects** — Create, edit, delete projects; assign team members
- **Tasks** — Kanban board with To Do / In Progress / Review / Done columns
- **Assignments** — Assign tasks to project members; filter by assignee
- **Dashboard** — Stats overview, recent tasks, overdue tracking
- **Role-Based Access** — Project admins can manage members; only owners can delete projects
- **Validations** — Input validation on all endpoints

## 🛠 Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | Vanilla HTML/CSS/JS (single file, no build step) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| Auth | JWT + bcryptjs |
| Deployment | Railway (backend) + Netlify (frontend) |

## 📁 Project Structure
```
taskflow/
├── backend/
│   ├── models/        # User, Project, Task schemas
│   ├── routes/        # auth, projects, tasks, users
│   ├── middleware/    # JWT auth, admin guard
│   ├── server.js
│   └── package.json
└── frontend/
    └── index.html     # Complete SPA
```

## 🔧 Local Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGODB_URI and JWT_SECRET
npm start
```

### Frontend
Open `frontend/index.html` in your browser, or serve with:
```bash
npx serve frontend
```

## 🚂 Deploy on Railway (Backend)

1. Push `backend/` folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = any long random string (e.g., `openssl rand -hex 32`)
   - `FRONTEND_URL` = your frontend URL (or `*`)
4. Railway auto-detects Node.js and deploys

## 🌐 Deploy Frontend (Netlify)

1. Go to [netlify.com](https://netlify.com) → Add new site → Deploy manually
2. Drag and drop the `frontend/` folder
3. After deployment, open browser console on your live frontend and run:
   ```js
   // Not needed — edit index.html line with API variable
   ```
4. **Edit `frontend/index.html` line 7:** Change the API URL to your Railway backend URL:
   ```js
   const API = 'https://YOUR-APP.up.railway.app/api';
   ```
   Then redeploy.

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project (admin) |
| DELETE | `/api/projects/:id` | Delete project (owner) |
| POST | `/api/projects/:id/members` | Add member (admin) |
| DELETE | `/api/projects/:id/members/:uid` | Remove member (admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks?project=id` | List tasks for project |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/dashboard` | Dashboard stats |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users?search=q` | Search users |
| PUT | `/api/users/profile/update` | Update own profile |
| PUT | `/api/users/:id/role` | Change role (global admin) |

## 🔐 Role-Based Access
- **Global Admin** — Can change any user's role
- **Project Admin** — Can add/remove members, edit/delete project
- **Project Member** — Can create/edit tasks, view project
- **Owner** — Only one who can delete a project
