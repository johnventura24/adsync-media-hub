import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  TrackChanges as RocksIcon,
  Assignment as TodosIcon,
  BugReport as IssuesIcon,
  Assessment as ScorecardsIcon,
  Event as MeetingsIcon,
  AccountTree as ProcessesIcon,
  People as UsersIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`data-tabpanel-${index}`}
      aria-labelledby={`data-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const DataPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // table or cards
  
  // Data states
  const [rocks, setRocks] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Ninety.io color scheme
  const ninetyColors = {
    primary: '#2563eb', // Ninety.io blue
    secondary: '#64748b', // Gray
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    background: '#f8fafc', // Light gray background
    cardBackground: '#ffffff',
    border: '#e2e8f0',
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8'
    }
  };

  const tabs = [
    { label: 'Scorecards', icon: <ScorecardsIcon />, count: scorecards.length, color: ninetyColors.primary },
    { label: 'Rocks', icon: <RocksIcon />, count: rocks.length, color: ninetyColors.success },
    { label: 'To-Dos', icon: <TodosIcon />, count: todos.length, color: ninetyColors.warning },
    { label: 'Issues', icon: <IssuesIcon />, count: issues.length, color: ninetyColors.error },
    { label: 'Meetings', icon: <MeetingsIcon />, count: meetings.length, color: ninetyColors.secondary },
    { label: 'Processes', icon: <ProcessesIcon />, count: processes.length, color: ninetyColors.primary },
    { label: 'People', icon: <UsersIcon />, count: users.length, color: ninetyColors.secondary },
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Add sample data for demonstration when no real data exists
  useEffect(() => {
    if (scorecards.length === 0) {
      setScorecards([
        {
          id: '1',
          name: 'Sales Scorecard',
          description: 'Weekly sales performance metrics',
          frequency: 'Weekly',
          is_active: true,
          updated_at: new Date().toISOString(),
          owner: 'John Smith'
        },
        {
          id: '2', 
          name: 'Marketing Scorecard',
          description: 'Marketing KPIs and lead generation',
          frequency: 'Weekly',
          is_active: true,
          updated_at: new Date().toISOString(),
          owner: 'Sarah Johnson'
        }
      ]);
    }

    if (rocks.length === 0) {
      setRocks([
        {
          id: '1',
          title: 'Increase Customer Satisfaction to 95%',
          owner_name: 'Demo User',
          quarter: 'Q4',
          year: 2024,
          progress_percentage: 78,
          status: 'On Track',
          due_date: '2024-12-31',
          priority: 'High'
        },
        {
          id: '2',
          title: 'Launch New Product Line',
          owner_name: 'Demo User', 
          quarter: 'Q4',
          year: 2024,
          progress_percentage: 45,
          status: 'On Track',
          due_date: '2024-12-15',
          priority: 'High'
        }
      ]);
    }

    if (todos.length === 0) {
      setTodos([
        {
          id: '1',
          title: 'Complete Q4 Performance Review',
          assignee_name: 'Demo User',
          priority: 'High',
          status: 'In Progress',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Update Team Process Documentation',
          assignee_name: 'Demo User',
          priority: 'Medium', 
          status: 'Not Started',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      ]);
    }

    if (issues.length === 0) {
      setIssues([
        {
          id: '1',
          title: 'Server Response Time Issues',
          reporter_name: 'Demo User',
          assignee_name: 'Tech Team',
          priority: 'High',
          status: 'Open',
          category: 'Technical',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Communication Process Gap',
          reporter_name: 'Demo User',
          assignee_name: 'Leadership Team', 
          priority: 'Medium',
          status: 'In Review',
          category: 'Process',
          created_at: new Date().toISOString()
        }
      ]);
    }

    if (meetings.length === 0) {
      setMeetings([
        {
          id: '1',
          title: 'Weekly Level 10 Meeting',
          organizer_name: 'Demo User',
          start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'L10',
          status: 'Scheduled',
          attendees: 8
        },
        {
          id: '2',
          title: 'Quarterly Business Review',
          organizer_name: 'Demo User',
          start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'QBR',
          status: 'Scheduled',
          attendees: 12
        }
      ]);
    }

    if (processes.length === 0) {
      setProcesses([
        {
          id: '1',
          name: 'Client Onboarding Process',
          owner_name: 'Demo User',
          department: 'Sales & Success Team',
          status: 'Active',
          updated_at: new Date().toISOString(),
          steps: 8
        },
        {
          id: '2',
          name: 'Content Creation Workflow',
          owner_name: 'Demo User',
          department: 'Creative Team',
          status: 'Active',
          updated_at: new Date().toISOString(),
          steps: 12
        }
      ]);
    }

    if (users.length === 0) {
      setUsers([
        {
          id: '1',
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@hubdashboard.com',
          department: 'Leadership Team',
          role: 'Admin',
          is_active: true,
          position: 'CEO'
        },
        {
          id: '2',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@hubdashboard.com',
          department: 'Creative Team',
          role: 'Member',
          is_active: true,
          position: 'Creative Director'
        }
      ]);
    }
  }, [scorecards.length, rocks.length, todos.length, issues.length, meetings.length, processes.length, users.length]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rocksRes, todosRes, issuesRes, scorecardsRes, meetingsRes, processesRes, usersRes] = await Promise.allSettled([
        api.get('/rocks'),
        api.get('/todos'), 
        api.get('/issues'),
        api.get('/scorecards'),
        api.get('/meetings'),
        api.get('/processes'),
        api.get('/users'),
      ]);

      if (rocksRes.status === 'fulfilled') setRocks(rocksRes.value.data.rocks || []);
      if (todosRes.status === 'fulfilled') setTodos(todosRes.value.data.todos || []);
      if (issuesRes.status === 'fulfilled') setIssues(issuesRes.value.data.issues || []);
      if (scorecardsRes.status === 'fulfilled') setScorecards(scorecardsRes.value.data.scorecards || []);
      if (meetingsRes.status === 'fulfilled') setMeetings(meetingsRes.value.data.meetings || []);
      if (processesRes.status === 'fulfilled') setProcesses(processesRes.value.data.processes || []);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.users || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'done': case 'closed': case 'active': return ninetyColors.success;
      case 'in progress': case 'in_progress': case 'on track': case 'scheduled': return ninetyColors.primary;
      case 'overdue': case 'at_risk': case 'high': return ninetyColors.error;
      case 'pending': case 'open': case 'medium': case 'in review': return ninetyColors.warning;
      default: return ninetyColors.secondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return ninetyColors.error;
      case 'medium': return ninetyColors.warning;
      case 'low': return ninetyColors.success;
      default: return ninetyColors.secondary;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const NinetyTable: React.FC<{ data: any[], columns: any[], emptyMessage: string }> = ({ data, columns, emptyMessage }) => (
    <Box sx={{ 
      backgroundColor: ninetyColors.cardBackground,
      border: `1px solid ${ninetyColors.border}`,
      borderRadius: 1,
      overflow: 'hidden'
    }}>
      <Table size="medium">
        <TableHead>
          <TableRow sx={{ backgroundColor: ninetyColors.background }}>
            {columns.map((col, index) => (
              <TableCell 
                key={index}
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: ninetyColors.text.primary,
                  borderBottom: `1px solid ${ninetyColors.border}`,
                  py: 2
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                align="center"
                sx={{ 
                  py: 6,
                  color: ninetyColors.text.muted,
                  fontSize: '0.875rem'
                }}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow 
                key={item.id || index}
                sx={{ 
                  '&:hover': { backgroundColor: '#f1f5f9' },
                  borderBottom: `1px solid ${ninetyColors.border}`,
                  '&:last-child': { borderBottom: 'none' }
                }}
              >
                {columns.map((col, colIndex) => (
                  <TableCell 
                    key={colIndex}
                    sx={{ 
                      fontSize: '0.875rem',
                      color: ninetyColors.text.primary,
                      py: 2
                    }}
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );

  const renderScorecardsTab = () => {
    const columns = [
      { label: 'Scorecard Name', key: 'name' },
      { label: 'Owner', key: 'owner' },
      { label: 'Frequency', key: 'frequency', render: (item: any) => (
        <Chip 
          label={item.frequency} 
          size="small" 
          sx={{ 
            backgroundColor: '#e0f2fe',
            color: ninetyColors.primary,
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Status', key: 'is_active', render: (item: any) => (
        <Chip 
          label={item.is_active ? 'Active' : 'Inactive'} 
          size="small" 
          sx={{ 
            backgroundColor: item.is_active ? '#dcfce7' : '#f3f4f6',
            color: item.is_active ? ninetyColors.success : ninetyColors.text.muted,
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Last Updated', key: 'updated_at', render: (item: any) => formatDate(item.updated_at) },
    ];

    return <NinetyTable data={scorecards} columns={columns} emptyMessage="No scorecards found" />;
  };

  const renderRocksTab = () => {
    const columns = [
      { label: 'Rock', key: 'title' },
      { label: 'Owner', key: 'owner_name' },
      { label: 'Quarter', key: 'quarter', render: (item: any) => (
        <Chip 
          label={`${item.quarter} ${item.year}`} 
          size="small" 
          sx={{ 
            backgroundColor: '#f0fdf4',
            color: ninetyColors.success,
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Progress', key: 'progress_percentage', render: (item: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
          <LinearProgress 
            variant="determinate" 
            value={item.progress_percentage || 0} 
            sx={{ 
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#e2e8f0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: item.progress_percentage >= 75 ? ninetyColors.success : 
                               item.progress_percentage >= 50 ? ninetyColors.warning : ninetyColors.error,
                borderRadius: 3
              }
            }}
          />
          <Typography variant="caption" sx={{ 
            fontWeight: 600, 
            minWidth: 35, 
            color: ninetyColors.text.secondary,
            fontSize: '0.75rem'
          }}>
            {item.progress_percentage || 0}%
          </Typography>
        </Box>
      )},
      { label: 'Status', key: 'status', render: (item: any) => (
        <Chip 
          label={item.status} 
          size="small" 
          sx={{ 
            backgroundColor: getStatusColor(item.status) + '20',
            color: getStatusColor(item.status),
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Due Date', key: 'due_date', render: (item: any) => formatDate(item.due_date) },
    ];

    return <NinetyTable data={rocks} columns={columns} emptyMessage="No rocks found" />;
  };

  const renderTodosTab = () => {
    const columns = [
      { label: 'Task', key: 'title' },
      { label: 'Assignee', key: 'assignee_name' },
      { label: 'Priority', key: 'priority', render: (item: any) => (
        <Chip 
          label={item.priority} 
          size="small" 
          sx={{ 
            backgroundColor: getPriorityColor(item.priority) + '20',
            color: getPriorityColor(item.priority),
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Status', key: 'status', render: (item: any) => (
        <Chip 
          label={item.status} 
          size="small" 
          sx={{ 
            backgroundColor: getStatusColor(item.status) + '20',
            color: getStatusColor(item.status),
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Due Date', key: 'due_date', render: (item: any) => formatDate(item.due_date) },
    ];

    return <NinetyTable data={todos} columns={columns} emptyMessage="No to-dos found" />;
  };

  const renderIssuesTab = () => {
    const columns = [
      { label: 'Issue', key: 'title' },
      { label: 'Reporter', key: 'reporter_name' },
      { label: 'Assignee', key: 'assignee_name' },
      { label: 'Priority', key: 'priority', render: (item: any) => (
        <Chip 
          label={item.priority} 
          size="small" 
          sx={{ 
            backgroundColor: getPriorityColor(item.priority) + '20',
            color: getPriorityColor(item.priority),
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Status', key: 'status', render: (item: any) => (
        <Chip 
          label={item.status} 
          size="small" 
          sx={{ 
            backgroundColor: getStatusColor(item.status) + '20',
            color: getStatusColor(item.status),
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Category', key: 'category', render: (item: any) => (
        <Chip 
          label={item.category} 
          size="small" 
          variant="outlined"
          sx={{ fontSize: '0.75rem' }}
        />
      )},
    ];

    return <NinetyTable data={issues} columns={columns} emptyMessage="No issues found" />;
  };

  const renderMeetingsTab = () => {
    const columns = [
      { label: 'Meeting', key: 'title' },
      { label: 'Organizer', key: 'organizer_name' },
      { label: 'Date', key: 'start_time', render: (item: any) => formatDate(item.start_time) },
      { label: 'Type', key: 'type', render: (item: any) => (
        <Chip 
          label={item.type} 
          size="small" 
          sx={{ 
            backgroundColor: '#e0f2fe',
            color: ninetyColors.primary,
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Attendees', key: 'attendees' },
      { label: 'Status', key: 'status', render: (item: any) => (
        <Chip 
          label={item.status} 
          size="small" 
          sx={{ 
            backgroundColor: getStatusColor(item.status) + '20',
            color: getStatusColor(item.status),
            fontSize: '0.75rem'
          }}
        />
      )},
    ];

    return <NinetyTable data={meetings} columns={columns} emptyMessage="No meetings found" />;
  };

  const renderProcessesTab = () => {
    const columns = [
      { label: 'Process Name', key: 'name' },
      { label: 'Owner', key: 'owner_name' },
      { label: 'Department', key: 'department' },
      { label: 'Steps', key: 'steps' },
      { label: 'Status', key: 'status', render: (item: any) => (
        <Chip 
          label={item.status} 
          size="small" 
          sx={{ 
            backgroundColor: getStatusColor(item.status) + '20',
            color: getStatusColor(item.status),
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Last Updated', key: 'updated_at', render: (item: any) => formatDate(item.updated_at) },
    ];

    return <NinetyTable data={processes} columns={columns} emptyMessage="No processes found" />;
  };

  const renderUsersTab = () => {
    const columns = [
      { label: 'Name', key: 'name', render: (item: any) => `${item.first_name} ${item.last_name}` },
      { label: 'Email', key: 'email' },
      { label: 'Position', key: 'position' },
      { label: 'Department', key: 'department' },
      { label: 'Role', key: 'role', render: (item: any) => (
        <Chip 
          label={item.role} 
          size="small" 
          sx={{ 
            backgroundColor: '#f3f4f6',
            color: ninetyColors.text.primary,
            fontSize: '0.75rem'
          }}
        />
      )},
      { label: 'Status', key: 'is_active', render: (item: any) => (
        <Chip 
          label={item.is_active ? 'Active' : 'Inactive'} 
          size="small" 
          sx={{ 
            backgroundColor: item.is_active ? '#dcfce7' : '#f3f4f6',
            color: item.is_active ? ninetyColors.success : ninetyColors.text.muted,
            fontSize: '0.75rem'
          }}
        />
      )},
    ];

    return <NinetyTable data={users} columns={columns} emptyMessage="No team members found" />;
  };

  return (
    <Box sx={{ backgroundColor: ninetyColors.background, minHeight: '100vh', p: 3 }}>
      {/* Header - Ninety.io style */}
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
          Data
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: ninetyColors.text.secondary,
            fontSize: '1rem'
          }}
        >
          View and manage all your EOS data in one place
        </Typography>
      </Box>

      {/* Filters - Ninety.io style */}
      <Card sx={{ 
        mb: 3, 
        backgroundColor: ninetyColors.cardBackground,
        border: `1px solid ${ninetyColors.border}`,
        borderRadius: 1,
        boxShadow: 'none'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: ninetyColors.text.muted }} />
                    </InputAdornment>
                  ),
                }}
                size="small"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: ninetyColors.cardBackground,
                    '& fieldset': {
                      borderColor: ninetyColors.border,
                    },
                    '&:hover fieldset': {
                      borderColor: ninetyColors.primary,
                    },
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: ninetyColors.text.secondary }}>Time Period</InputLabel>
                <Select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  sx={{ 
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: ninetyColors.border,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: ninetyColors.primary,
                    }
                  }}
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="quarter">This Quarter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: ninetyColors.text.secondary }}>Team</InputLabel>
                <Select 
                  value={teamFilter} 
                  onChange={(e) => setTeamFilter(e.target.value)}
                  sx={{ 
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: ninetyColors.border,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: ninetyColors.primary,
                    }
                  }}
                >
                  <MenuItem value="all">All Teams</MenuItem>
                  <MenuItem value="account">Account Team</MenuItem>
                  <MenuItem value="auto">Auto Team</MenuItem>
                  <MenuItem value="creative">Creative Team</MenuItem>
                  <MenuItem value="cro">CRO Team</MenuItem>
                  <MenuItem value="finance">Finance & Admin Team</MenuItem>
                  <MenuItem value="leadership">Leadership Team</MenuItem>
                  <MenuItem value="media">Media Team</MenuItem>
                  <MenuItem value="medicare">Medicare ACA</MenuItem>
                  <MenuItem value="sales">Sales & Success Team</MenuItem>
                  <MenuItem value="taxonomy">Taxonomy</MenuItem>
                  <MenuItem value="tech">Tech Team</MenuItem>
                  <MenuItem value="testing">Testing Team</MenuItem>
                  <MenuItem value="vii">VII</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button 
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                onClick={() => window.location.href = '/import'}
                sx={{ 
                  backgroundColor: ninetyColors.primary,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: ninetyColors.primary,
                    boxShadow: 'none'
                  }
                }}
              >
                Import Data
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs - Ninety.io style */}
      <Card sx={{ 
        backgroundColor: ninetyColors.cardBackground,
        border: `1px solid ${ninetyColors.border}`,
        borderRadius: 1,
        boxShadow: 'none'
      }}>
        <Box sx={{ borderBottom: `1px solid ${ninetyColors.border}` }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: ninetyColors.primary,
                height: 3,
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: ninetyColors.text.secondary,
                minHeight: 48,
                '&.Mui-selected': {
                  color: ninetyColors.primary,
                  fontWeight: 600,
                },
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.label}
                    <Chip 
                      label={tab.count} 
                      size="small" 
                      sx={{ 
                        backgroundColor: currentTab === index ? '#e0f2fe' : '#f3f4f6',
                        color: currentTab === index ? ninetyColors.primary : ninetyColors.text.muted,
                        fontSize: '0.75rem',
                        height: 20,
                        minWidth: 24,
                      }}
                    />
                  </Box>
                }
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        {loading && <LinearProgress sx={{ backgroundColor: ninetyColors.background }} />}

        <Box sx={{ p: 3 }}>
          <TabPanel value={currentTab} index={0}>
            {renderScorecardsTab()}
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            {renderRocksTab()}
          </TabPanel>
          <TabPanel value={currentTab} index={2}>
            {renderTodosTab()}
          </TabPanel>
          <TabPanel value={currentTab} index={3}>
            {renderIssuesTab()}
          </TabPanel>
          <TabPanel value={currentTab} index={4}>
            {renderMeetingsTab()}
          </TabPanel>
          <TabPanel value={currentTab} index={5}>
            {renderProcessesTab()}
          </TabPanel>
          <TabPanel value={currentTab} index={6}>
            {renderUsersTab()}
          </TabPanel>
        </Box>
      </Card>
    </Box>
  );
};

export default DataPage;