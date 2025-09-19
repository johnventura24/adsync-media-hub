import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrackChanges as RocksIcon,
  Assignment as TodosIcon,
  BugReport as IssuesIcon,
  Event as MeetingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import { api, endpoints } from '../../services/api';
import { useOrganization } from '../../contexts/OrganizationContext';

interface DashboardMetrics {
  rocks: {
    total: number;
    completed: number;
    in_progress: number;
    average_completion: number;
  };
  todos: {
    total: number;
    completed: number;
    overdue: number;
    due_today: number;
  };
  issues: {
    total: number;
    open: number;
    resolved: number;
  };
  meetings: {
    upcoming: number;
    completed: number;
  };
}

interface PersonalDashboard {
  rocks: any[];
  todos: any[];
  issues: any[];
  meetings: any[];
  stats: {
    rocks_completion: number;
    todos_overdue: number;
    todos_due_today: number;
    high_priority_items: number;
    meetings_today: number;
  };
}

const MetricCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error';
  trend?: 'up' | 'down';
  progress?: number;
}> = ({ title, value, subtitle, icon, color = 'primary', trend, progress }) => {
  return (
    <Card sx={{ 
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 1,
      boxShadow: 'none',
      '&:hover': { 
        borderColor: '#2563eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      },
      transition: 'all 0.2s ease-in-out'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
          {trend && (
            <Box sx={{ color: trend === 'up' ? 'success.main' : 'error.main' }}>
              {trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />}
            </Box>
          )}
        </Box>
        
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          {value}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {title}
        </Typography>
        
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 6, borderRadius: 3 }}
              color={color}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {progress}% complete
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const { currentOrganization } = useOrganization();

  // Fetch organization dashboard
  const { data: orgDashboard, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['dashboard', 'organization', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      const response = await api.get(endpoints.dashboard.overview(currentOrganization.id));
      return response.data.dashboard as DashboardMetrics;
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch personal dashboard
  const { data: personalDashboard, isLoading: personalLoading, error: personalError } = useQuery({
    queryKey: ['dashboard', 'personal', currentOrganization?.id],
    queryFn: async () => {
      const response = await api.get(endpoints.dashboard.personal, {
        params: { organizationId: currentOrganization?.id }
      });
      return response.data.dashboard as PersonalDashboard;
    },
    enabled: !!currentOrganization?.id,
  });

  if (!currentOrganization) {
    return (
      <Alert severity="warning">
        Please select an organization to view the dashboard.
      </Alert>
    );
  }

  if (orgLoading || personalLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (orgError || personalError) {
    return (
      <Alert severity="error">
        Failed to load dashboard data. Please try again.
      </Alert>
    );
  }

  // Ninety.io color scheme
  const ninetyColors = {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#f8fafc',
    cardBackground: '#ffffff',
    border: '#e2e8f0',
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8'
    }
  };

  return (
    <Box sx={{ backgroundColor: ninetyColors.background, minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            mb: 1, 
            color: ninetyColors.text.primary,
            fontSize: '2rem'
          }}
        >
          Dashboard
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: ninetyColors.text.secondary,
            fontSize: '1rem'
          }}
        >
          Welcome back! Here's what's happening at {currentOrganization.name}
        </Typography>
      </Box>

      {/* Personal Stats */}
      {personalDashboard && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Your Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricCard
                title="Rocks Progress"
                value={`${personalDashboard.stats.rocks_completion}%`}
                icon={<RocksIcon />}
                color="primary"
                progress={personalDashboard.stats.rocks_completion}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricCard
                title="Overdue Tasks"
                value={personalDashboard.stats.todos_overdue}
                subtitle="Need attention"
                icon={<TodosIcon />}
                color={personalDashboard.stats.todos_overdue > 0 ? 'error' : 'success'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricCard
                title="Due Today"
                value={personalDashboard.stats.todos_due_today}
                subtitle="Tasks"
                icon={<TodosIcon />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricCard
                title="High Priority"
                value={personalDashboard.stats.high_priority_items}
                subtitle="Items"
                icon={<IssuesIcon />}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <MetricCard
                title="Meetings Today"
                value={personalDashboard.stats.meetings_today}
                icon={<MeetingsIcon />}
                color="primary"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Organization Stats */}
      {orgDashboard && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Organization Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Active Rocks"
                value={orgDashboard.rocks.total}
                subtitle={`${orgDashboard.rocks.completed} completed`}
                icon={<RocksIcon />}
                color="primary"
                progress={orgDashboard.rocks.average_completion}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Tasks"
                value={orgDashboard.todos.total}
                subtitle={`${orgDashboard.todos.overdue} overdue`}
                icon={<TodosIcon />}
                color={orgDashboard.todos.overdue > 0 ? 'warning' : 'success'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Open Issues"
                value={orgDashboard.issues.open}
                subtitle={`${orgDashboard.issues.resolved} resolved`}
                icon={<IssuesIcon />}
                color={orgDashboard.issues.open > 0 ? 'error' : 'success'}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Upcoming Meetings"
                value={orgDashboard.meetings.upcoming}
                subtitle={`${orgDashboard.meetings.completed} completed`}
                icon={<MeetingsIcon />}
                color="primary"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Recent Activity */}
      <Grid container spacing={3}>
        {/* Recent Rocks */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 1,
            boxShadow: 'none'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                mb: 2, 
                color: '#1e293b',
                fontSize: '1.125rem'
              }}>
                Your Rocks
              </Typography>
              {personalDashboard?.rocks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No rocks assigned for this quarter.
                </Typography>
              ) : (
                personalDashboard?.rocks.slice(0, 5).map((rock: any) => (
                  <Box key={rock.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {rock.title}
                      </Typography>
                      <Chip
                        label={`${rock.completion_percentage}%`}
                        size="small"
                        color={rock.completion_percentage === 100 ? 'success' : 'primary'}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={rock.completion_percentage}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Tasks */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 1,
            boxShadow: 'none'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                mb: 2, 
                color: '#1e293b',
                fontSize: '1.125rem'
              }}>
                Your To-Dos
              </Typography>
              {personalDashboard?.todos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tasks assigned.
                </Typography>
              ) : (
                personalDashboard?.todos.slice(0, 5).map((todo: any) => (
                  <Box key={todo.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {todo.title}
                      </Typography>
                      <Chip
                        label={todo.priority}
                        size="small"
                        color={
                          todo.priority === 'urgent' ? 'error' :
                          todo.priority === 'high' ? 'warning' :
                          'default'
                        }
                      />
                    </Box>
                    {todo.due_date && (
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(todo.due_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
