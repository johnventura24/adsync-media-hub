# Hub Dashboard

A comprehensive business management platform similar to Ninety.io, built for the Entrepreneurial Operating System (EOS). This application helps organizations track rocks (quarterly goals), manage to-dos, resolve issues, conduct Level 10 meetings, monitor scorecards, and document processes.

## 🚀 Features

### Core EOS Functionality
- **Rocks Management** - Track quarterly goals and objectives with progress monitoring
- **To-Dos** - Manage tasks and action items with priority levels and due dates
- **Issues List** - Log, discuss, and resolve business issues systematically
- **Level 10 Meetings** - Schedule and conduct structured EOS meetings
- **Scorecards** - Monitor KPIs with visual dashboards and trend tracking
- **Process Documentation** - Document and track business processes
- **Accountability Chart** - Define roles and responsibilities

### Additional Features
- **Team Management** - Manage 50+ users with role-based access control
- **CSV Data Import** - Import existing data from Ninety.io and other sources
- **Real-time Dashboard** - Comprehensive overview of organizational health
- **Notifications** - Stay updated on important changes and deadlines
- **Multi-organization Support** - Manage multiple organizations from one account

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - PostgreSQL database with real-time features
- **JWT** - Authentication and authorization
- **Multer** - File upload handling
- **CSV Parser** - Data import functionality

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **React Query** - Data fetching and caching
- **React Router** - Navigation
- **Recharts** - Data visualization

### Deployment
- **Render** - Hosting platform
- **GitHub** - Version control and CI/CD
- **Supabase** - Managed database

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Supabase account
- Render account (for deployment)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/hub-dashboard.git
cd hub-dashboard
```

### 2. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install --legacy-peer-deps
cd ..
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

Create a `.env` file in the `client` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the database schema from `database/schema.sql`
3. Update your environment variables with the Supabase credentials

### 5. Start the Development Servers

```bash
# Start the backend server
npm run dev

# In a new terminal, start the frontend
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with the following main entities:

- **Users** - User accounts and profiles
- **Organizations** - Company/organization data
- **Rocks** - Quarterly goals with milestones
- **Todos** - Tasks and action items
- **Issues** - Business problems and resolutions
- **Meetings** - Scheduled meetings with attendees
- **Scorecards** - KPI tracking with metrics and entries
- **Processes** - Business process documentation
- **Comments** - Comments on various entities
- **Attachments** - File attachments
- **Notifications** - User notifications
- **Audit Logs** - Change tracking

## 📁 Project Structure

```
hub-dashboard/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── App.tsx
│   └── package.json
├── config/                 # Configuration files
├── database/              # Database schema and migrations
├── middleware/            # Express middleware
├── routes/                # API routes
├── uploads/               # File uploads directory
├── server.js              # Express server
├── package.json
└── README.md
```

## 🔐 Authentication & Authorization

The application implements JWT-based authentication with role-based access control:

- **Admin** - Full system access
- **Manager** - Organization management capabilities
- **Member** - Standard user access

## 📤 CSV Import

The application supports importing data from Ninety.io and other sources via CSV files:

- Users and team members
- Rocks and quarterly goals
- To-dos and tasks
- Issues and problems
- Scorecards and metrics

## 🚀 Deployment

### Deploy to Render

1. **Prepare for Deployment**
   ```bash
   npm run build
   ```

2. **Create a Render Account** and connect your GitHub repository

3. **Create a Web Service** with the following settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: Add all your production environment variables

4. **Database Setup**: Your Supabase database will work in production with the correct environment variables

### Environment Variables for Production

Make sure to set these environment variables in Render:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
JWT_SECRET=your_production_jwt_secret
FRONTEND_URL=https://your-app-name.onrender.com
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client
npm test
```

## 📖 API Documentation

The API follows RESTful conventions with the following main endpoints:

- `POST /api/auth/login` - User authentication
- `GET /api/dashboard/my-dashboard` - Personal dashboard
- `GET /api/rocks/organization/:id` - Get organization rocks
- `POST /api/todos` - Create new todo
- `GET /api/issues/organization/:id` - Get organization issues
- `POST /api/csv/upload` - Upload CSV file
- `GET /api/scorecards/organization/:id` - Get scorecards

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/hub-dashboard/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🙏 Acknowledgments

- Inspired by Ninety.io and the Entrepreneurial Operating System (EOS)
- Built with modern web technologies for scalability and performance
- Designed for teams of 50+ members with enterprise-grade features

---

**Note**: This application is designed to replace Ninety.io with enhanced features and customization options. It supports importing existing Ninety.io data via CSV files for seamless migration.
