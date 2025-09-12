import axios from 'axios';

// Base URL configuration
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instances
export const authApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
const handleResponseError = (error: any) => {
  if (error.response?.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

authApi.interceptors.response.use(
  (response) => response,
  handleResponseError
);

api.interceptors.response.use(
  (response) => response,
  handleResponseError
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    profile: '/auth/profile',
    changePassword: '/auth/change-password',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
  },
  
  // Dashboard
  dashboard: {
    overview: (orgId: string) => `/dashboard/organization/${orgId}`,
    personal: '/dashboard/my-dashboard',
    charts: (orgId: string) => `/dashboard/organization/${orgId}/charts`,
    notifications: {
      markRead: (notificationId: string) => `/dashboard/notifications/${notificationId}/read`,
      markAllRead: '/dashboard/notifications/mark-all-read',
    },
  },
  
  // Users
  users: {
    organization: (orgId: string) => `/users/organization/${orgId}`,
    profile: (userId: string) => `/users/${userId}`,
    update: (userId: string) => `/users/${userId}`,
    activity: (userId: string) => `/users/${userId}/activity`,
    addToOrg: (userId: string) => `/users/${userId}/organizations`,
    removeFromOrg: (userId: string, orgId: string) => `/users/${userId}/organizations/${orgId}`,
    search: '/users/search',
  },
  
  // Rocks
  rocks: {
    organization: (orgId: string) => `/rocks/organization/${orgId}`,
    single: (rockId: string) => `/rocks/${rockId}`,
    create: '/rocks',
    update: (rockId: string) => `/rocks/${rockId}`,
    delete: (rockId: string) => `/rocks/${rockId}`,
    summary: (orgId: string) => `/rocks/organization/${orgId}/summary`,
    myRocks: '/rocks/my-rocks',
    milestones: {
      add: (rockId: string) => `/rocks/${rockId}/milestones`,
      update: (milestoneId: string) => `/rocks/milestones/${milestoneId}`,
      delete: (milestoneId: string) => `/rocks/milestones/${milestoneId}`,
    },
  },
  
  // Todos
  todos: {
    organization: (orgId: string) => `/todos/organization/${orgId}`,
    create: '/todos',
    update: (todoId: string) => `/todos/${todoId}`,
    delete: (todoId: string) => `/todos/${todoId}`,
    summary: (orgId: string) => `/todos/organization/${orgId}/summary`,
    myTodos: '/todos/my-todos',
  },
  
  // Issues
  issues: {
    organization: (orgId: string) => `/issues/organization/${orgId}`,
    single: (issueId: string) => `/issues/${issueId}`,
    create: '/issues',
    update: (issueId: string) => `/issues/${issueId}`,
    delete: (issueId: string) => `/issues/${issueId}`,
    summary: (orgId: string) => `/issues/organization/${orgId}/summary`,
    myIssues: '/issues/my-issues',
    comments: {
      add: (issueId: string) => `/issues/${issueId}/comments`,
    },
  },
  
  // Meetings
  meetings: {
    organization: (orgId: string) => `/meetings/organization/${orgId}`,
    single: (meetingId: string) => `/meetings/${meetingId}`,
    create: '/meetings',
    update: (meetingId: string) => `/meetings/${meetingId}`,
    delete: (meetingId: string) => `/meetings/${meetingId}`,
    myMeetings: '/meetings/my-meetings',
    attendees: {
      add: (meetingId: string) => `/meetings/${meetingId}/attendees`,
      update: (attendeeId: string) => `/meetings/attendees/${attendeeId}`,
    },
  },
  
  // Scorecards
  scorecards: {
    organization: (orgId: string) => `/scorecards/organization/${orgId}`,
    single: (scorecardId: string) => `/scorecards/${scorecardId}`,
    create: '/scorecards',
    update: (scorecardId: string) => `/scorecards/${scorecardId}`,
    delete: (scorecardId: string) => `/scorecards/${scorecardId}`,
    metrics: {
      add: (scorecardId: string) => `/scorecards/${scorecardId}/metrics`,
      update: (metricId: string) => `/scorecards/metrics/${metricId}`,
      delete: (metricId: string) => `/scorecards/metrics/${metricId}`,
    },
    entries: {
      add: (metricId: string) => `/scorecards/metrics/${metricId}/entries`,
      update: (entryId: string) => `/scorecards/entries/${entryId}`,
      delete: (entryId: string) => `/scorecards/entries/${entryId}`,
    },
  },
  
  // Processes
  processes: {
    organization: (orgId: string) => `/processes/organization/${orgId}`,
    single: (processId: string) => `/processes/${processId}`,
    create: '/processes',
    update: (processId: string) => `/processes/${processId}`,
    delete: (processId: string) => `/processes/${processId}`,
    summary: (orgId: string) => `/processes/organization/${orgId}/summary`,
    execute: (processId: string) => `/processes/${processId}/execute`,
    executions: {
      update: (executionId: string) => `/processes/executions/${executionId}`,
    },
  },
  
  // CSV Import
  csv: {
    importTypes: '/csv/import-types',
    upload: '/csv/upload',
    import: '/csv/import',
    history: '/csv/history',
    template: (type: string) => `/csv/template/${type}`,
  },
};

// Helper functions for common API patterns
export const apiHelpers = {
  // Get data with pagination
  getPaginated: async (endpoint: string, params: any = {}) => {
    const response = await api.get(endpoint, { params });
    return response.data;
  },
  
  // Create resource
  create: async (endpoint: string, data: any) => {
    const response = await api.post(endpoint, data);
    return response.data;
  },
  
  // Update resource
  update: async (endpoint: string, data: any) => {
    const response = await api.put(endpoint, data);
    return response.data;
  },
  
  // Delete resource
  delete: async (endpoint: string) => {
    const response = await api.delete(endpoint);
    return response.data;
  },
  
  // Upload file
  uploadFile: async (endpoint: string, formData: FormData) => {
    const response = await api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Download file
  downloadFile: async (endpoint: string, filename: string) => {
    const response = await api.get(endpoint, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
