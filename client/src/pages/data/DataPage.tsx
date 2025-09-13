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
  const [rocks, setRocks] = useState([]);
  const [todos, setTodos] = useState([]);
  const [issues, setIssues] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [users, setUsers] = useState([]);
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
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Actions</TableCell>
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
                <TableRow key={scorecard.id}>
                  <TableCell>{scorecard.name}</TableCell>
                  <TableCell>{scorecard.description}</TableCell>
                  <TableCell>
                    <Chip label={scorecard.frequency || 'Weekly'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={scorecard.is_active ? 'Active' : 'Inactive'} 
                      color={scorecard.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(scorecard.updated_at)}</TableCell>
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

  const renderRocksTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Rocks (Quarterly Goals)</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Rock
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Quarter</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
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
                <TableRow key={rock.id}>
                  <TableCell>{rock.title}</TableCell>
                  <TableCell>{rock.owner_name || 'Unassigned'}</TableCell>
                  <TableCell>
                    <Chip label={`${rock.quarter} ${rock.year}`} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={rock.progress_percentage || 0} 
                        sx={{ width: 60, height: 8 }}
                      />
                      <Typography variant="caption">{rock.progress_percentage || 0}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={rock.status || 'Not Started'} 
                      color={getStatusColor(rock.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(rock.due_date)}</TableCell>
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

  const renderTodosTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">To-Dos & Tasks</Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          New Task
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
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
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Reporter</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Actions</TableCell>
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Data
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Record and evaluate key metrics, streamlined for strategic success.
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<AddIcon />}
          onClick={() => window.location.href = '/import'}
        >
          Import Data
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Period</InputLabel>
                <Select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annual">Annual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Team</InputLabel>
                <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                  <MenuItem value="all">All Teams</MenuItem>
                  <MenuItem value="creative">Creative Team</MenuItem>
                  <MenuItem value="editors">Editors Team</MenuItem>
                  <MenuItem value="copywriter">Copywriter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.label}
                    <Chip label={tab.count} size="small" />
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
            <Alert severity="info">Meetings data view coming soon...</Alert>
          </TabPanel>
          <TabPanel value={currentTab} index={5}>
            <Alert severity="info">Processes data view coming soon...</Alert>
          </TabPanel>
          <TabPanel value={currentTab} index={6}>
            <Alert severity="info">Users data view coming soon...</Alert>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DataPage;
