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
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const DataPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('weekly');
  const [teamFilter, setTeamFilter] = useState('all');
  
  // Data states
  const [rocks, setRocks] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { label: 'Scorecards', icon: <ScorecardsIcon />, count: scorecards.length },
    { label: 'Rocks', icon: <RocksIcon />, count: rocks.length },
    { label: 'To-Dos', icon: <TodosIcon />, count: todos.length },
    { label: 'Issues', icon: <IssuesIcon />, count: issues.length },
    { label: 'Meetings', icon: <MeetingsIcon />, count: meetings.length },
    { label: 'Processes', icon: <ProcessesIcon />, count: processes.length },
    { label: 'Users', icon: <UsersIcon />, count: users.length },
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
          name: 'Creative Team Scorecard',
          description: 'Track creative team performance metrics',
          frequency: 'weekly',
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '2', 
          name: 'Copywriter Performance',
          description: 'Monitor copywriter deliverables and quality',
          frequency: 'weekly',
          is_active: true,
          updated_at: new Date().toISOString()
        }
      ]);
    }

    if (rocks.length === 0) {
      setRocks([
        {
          id: '1',
          title: 'Increase Customer Satisfaction',
          owner_name: 'Demo User',
          quarter: 'Q4',
          year: 2024,
          progress_percentage: 75,
          status: 'on_track',
          due_date: '2024-12-31'
        },
        {
          id: '2',
          title: 'Launch Mobile App',
          owner_name: 'Demo User', 
          quarter: 'Q4',
          year: 2024,
          progress_percentage: 60,
          status: 'on_track',
          due_date: '2024-12-15'
        }
      ]);
    }

    if (todos.length === 0) {
      setTodos([
        {
          id: '1',
          title: 'Review Q4 Performance Metrics',
          assignee_name: 'Demo User',
          priority: 'high',
          status: 'pending',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          title: 'Update Team Documentation',
          assignee_name: 'Demo User',
          priority: 'medium', 
          status: 'in_progress',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    }

    if (issues.length === 0) {
      setIssues([
        {
          id: '1',
          title: 'Server Response Time',
          reporter_name: 'Demo User',
          assignee_name: 'Demo User',
          priority: 'high',
          status: 'open',
          category: 'technical'
        },
        {
          id: '2',
          title: 'Communication Gap',
          reporter_name: 'Demo User',
          assignee_name: 'Demo User', 
          priority: 'medium',
          status: 'open',
          category: 'process'
        }
      ]);
    }

    if (meetings.length === 0) {
      setMeetings([
        {
          id: '1',
          title: 'Weekly L10 Meeting',
          organizer_name: 'Demo User',
          start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'L10',
          status: 'scheduled'
        },
        {
          id: '2',
          title: 'Quarterly Planning Session',
          organizer_name: 'Demo User',
          start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'Planning',
          status: 'scheduled'
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
          status: 'active',
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Content Creation Workflow',
          owner_name: 'Demo User',
          department: 'Creative Team',
          status: 'active',
          updated_at: new Date().toISOString()
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
          role: 'admin',
          is_active: true
        },
        {
          id: '2',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@hubdashboard.com',
          department: 'Creative Team',
          role: 'member',
          is_active: true
        }
      ]);
    }
  }, [scorecards.length, rocks.length, todos.length, issues.length, meetings.length, processes.length, users.length]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data types
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
      case 'completed': case 'done': case 'closed': return 'success';
      case 'in_progress': case 'active': case 'on_track': return 'primary';
      case 'overdue': case 'at_risk': case 'high': return 'error';
      case 'pending': case 'open': case 'medium': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const renderScorecardsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Scorecards & KPIs</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Scorecard
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Frequency</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Last Updated</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scorecards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Alert severity="info">No scorecards found. Import your data or create new scorecards.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              scorecards.map((scorecard: any) => (
                <TableRow 
                  key={scorecard.id}
                  sx={{ 
                    '&:hover': { backgroundColor: '#f5f5f5' },
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{scorecard.name}</TableCell>
                  <TableCell sx={{ color: '#666' }}>{scorecard.description}</TableCell>
                  <TableCell>
                    <Chip 
                      label={scorecard.frequency || 'Weekly'} 
                      size="small" 
                      sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={scorecard.is_active ? 'Active' : 'Inactive'} 
                      color={scorecard.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#666' }}>{formatDate(scorecard.updated_at)}</TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: '#1976d2' }}><EditIcon /></IconButton>
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderRocksTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Rocks (Quarterly Goals)</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Rock
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Owner</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Quarter</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Progress</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Alert severity="info">No rocks found. Import your data or create new quarterly goals.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              rocks.map((rock: any) => (
                <TableRow 
                  key={rock.id}
                  sx={{ 
                    '&:hover': { backgroundColor: '#f5f5f5' },
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{rock.title}</TableCell>
                  <TableCell sx={{ color: '#666' }}>{rock.owner_name || 'Unassigned'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${rock.quarter} ${rock.year}`} 
                      size="small" 
                      sx={{ backgroundColor: '#e8f5e8', color: '#2e7d32' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={rock.progress_percentage || 0} 
                        sx={{ 
                          width: 80, 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: rock.progress_percentage >= 75 ? '#4caf50' : 
                                           rock.progress_percentage >= 50 ? '#ff9800' : '#f44336'
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 35 }}>
                        {rock.progress_percentage || 0}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={rock.status || 'Not Started'} 
                      color={getStatusColor(rock.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#666' }}>{formatDate(rock.due_date)}</TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: '#1976d2' }}><EditIcon /></IconButton>
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderTodosTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">To-Dos & Tasks</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Task
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Assignee</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {todos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Alert severity="info">No tasks found. Import your data or create new tasks.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              todos.map((todo: any) => (
                <TableRow key={todo.id}>
                  <TableCell>{todo.title}</TableCell>
                  <TableCell>{todo.assignee_name || 'Unassigned'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={todo.priority || 'Medium'} 
                      color={getPriorityColor(todo.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={todo.status || 'Pending'} 
                      color={getStatusColor(todo.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(todo.due_date)}</TableCell>
                  <TableCell>
                    <IconButton size="small"><EditIcon /></IconButton>
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderIssuesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Issues & Problems</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Issue
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Reporter</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Assignee</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Alert severity="info">No issues found. Import your data or create new issues.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue: any) => (
                <TableRow key={issue.id}>
                  <TableCell>{issue.title}</TableCell>
                  <TableCell>{issue.reporter_name || 'Unknown'}</TableCell>
                  <TableCell>{issue.assignee_name || 'Unassigned'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={issue.priority || 'Medium'} 
                      color={getPriorityColor(issue.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={issue.status || 'Open'} 
                      color={getStatusColor(issue.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={issue.category || 'General'} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><EditIcon /></IconButton>
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderMeetingsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Meetings & L10s</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Meeting
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Organizer</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Alert severity="info">No meetings found. Import your data or schedule new meetings.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting: any) => (
                <TableRow key={meeting.id}>
                  <TableCell>{meeting.title}</TableCell>
                  <TableCell>{meeting.organizer_name || 'Unknown'}</TableCell>
                  <TableCell>{formatDate(meeting.start_time)}</TableCell>
                  <TableCell>
                    <Chip label={meeting.type || 'L10'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={meeting.status || 'Scheduled'} 
                      color={getStatusColor(meeting.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><EditIcon /></IconButton>
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderProcessesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Process Documentation</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Process
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Process Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Owner</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Last Updated</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Alert severity="info">No processes found. Import your data or document new processes.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              processes.map((process: any) => (
                <TableRow key={process.id}>
                  <TableCell>{process.name}</TableCell>
                  <TableCell>{process.owner_name || 'Unassigned'}</TableCell>
                  <TableCell>{process.department || 'General'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={process.status || 'Active'} 
                      color={getStatusColor(process.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(process.updated_at)}</TableCell>
                  <TableCell>
                    <IconButton size="small"><EditIcon /></IconButton>
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderUsersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Team Members</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          Add Member
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Alert severity="info">No users found. Import your team data or add new members.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department || 'General'}</TableCell>
                  <TableCell>
                    <Chip label={user.role || 'Member'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.is_active ? 'Active' : 'Inactive'} 
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><EditIcon /></IconButton>
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1976d2' }}>
            Data Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your EOS data center - Track Rocks, To-Dos, Issues, Scorecards, and more in one place.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={() => window.location.href = '/import'}
          >
            Import Data
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            sx={{ 
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)'
            }}
          >
            Quick Add
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search across all data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                size="small"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#1976d2',
                    },
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Period</InputLabel>
                <Select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="weekly">This Week</MenuItem>
                  <MenuItem value="monthly">This Month</MenuItem>
                  <MenuItem value="quarterly">This Quarter</MenuItem>
                  <MenuItem value="annual">This Year</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Team/Department</InputLabel>
                <Select 
                  value={teamFilter} 
                  onChange={(e) => setTeamFilter(e.target.value)}
                  sx={{ borderRadius: 2 }}
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
                fullWidth 
                variant="outlined" 
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setTimeFilter('weekly');
                  setTeamFilter('all');
                }}
                sx={{ borderRadius: 2, height: 40 }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                '&.Mui-selected': {
                  color: '#1976d2',
                  fontWeight: 600,
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                backgroundColor: '#1976d2',
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
                        backgroundColor: currentTab === index ? '#e3f2fd' : '#f5f5f5',
                        color: currentTab === index ? '#1976d2' : '#666',
                        fontWeight: currentTab === index ? 600 : 400,
                        minWidth: 24,
                        height: 20,
                      }}
                    />
                  </Box>
                }
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        {loading && <LinearProgress />}

        <CardContent>
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
        </CardContent>
      </Card>
    </Box>
  );
};

export default DataPage;
