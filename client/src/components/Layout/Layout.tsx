import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  TrackChanges as RocksIcon,
  Assignment as TodosIcon,
  BugReport as IssuesIcon,
  Event as MeetingsIcon,
  Assessment as ScorecardsIcon,
  AccountTree as ProcessesIcon,
  People as TeamIcon,
  CloudUpload as ImportIcon,
  Storage as DataIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import NavigationItem from './NavigationItem';
import OrganizationSelector from './OrganizationSelector';
import NotificationPanel from './NotificationPanel';

const drawerWidth = 280;

const navigationItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Data', icon: DataIcon, path: '/data' },
  { text: 'Rocks', icon: RocksIcon, path: '/rocks' },
  { text: 'To-Dos', icon: TodosIcon, path: '/todos' },
  { text: 'Issues', icon: IssuesIcon, path: '/issues' },
  { text: 'Meetings', icon: MeetingsIcon, path: '/meetings' },
  { text: 'Scorecards', icon: ScorecardsIcon, path: '/scorecards' },
  { text: 'Processes', icon: ProcessesIcon, path: '/processes' },
  { text: 'Team', icon: TeamIcon, path: '/team' },
  { text: 'Import Data', icon: ImportIcon, path: '/import' },
];

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();

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
  
  // TEMPORARY: Mock user for testing when auth is disabled
  const displayUser = user || {
    first_name: 'Demo',
    last_name: 'User',
    email: 'demo@hubdashboard.com',
    role: 'admin'
  };
  const { currentOrganization } = useOrganization();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
  };

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: ninetyColors.cardBackground,
      borderRight: `1px solid ${ninetyColors.border}`
    }}>
      {/* Logo/Brand */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <BusinessIcon sx={{ fontSize: 28, color: ninetyColors.primary }} />
        <Typography variant="h6" sx={{ 
          fontWeight: 700, 
          color: ninetyColors.text.primary,
          fontSize: '1.125rem'
        }}>
          EOS Hub
        </Typography>
      </Box>
      
      <Divider sx={{ borderColor: ninetyColors.border }} />
      
      {/* Organization Selector */}
      <Box sx={{ p: 3 }}>
        <OrganizationSelector />
      </Box>
      
      <Divider sx={{ borderColor: ninetyColors.border }} />
      
      {/* Navigation */}
      <List sx={{ flexGrow: 1, px: 2, py: 1 }}>
        {navigationItems.map((item) => (
          <NavigationItem
            key={item.path}
            text={item.text}
            icon={item.icon}
            path={item.path}
            onClick={isMobile ? handleDrawerToggle : undefined}
          />
        ))}
      </List>
      
      <Divider />
      
      {/* Settings */}
      <List sx={{ px: 1 }}>
        <NavigationItem
          text="Settings"
          icon={SettingsIcon}
          path="/settings"
          onClick={isMobile ? handleDrawerToggle : undefined}
        />
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: ninetyColors.cardBackground,
          borderBottom: `1px solid ${ninetyColors.border}`,
          boxShadow: 'none',
          color: ninetyColors.text.primary,
        }}
      >
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Organization name */}
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {currentOrganization && (
              <>
                <Typography variant="h6" noWrap>
                  {currentOrganization.name}
                </Typography>
                {currentOrganization.industry && (
                  <Chip
                    label={currentOrganization.industry}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                )}
              </>
            )}
          </Box>
          
          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={() => setNotificationsPanelOpen(true)}
            sx={{ mr: 1 }}
          >
            <NotificationsIcon />
          </IconButton>
          
          {/* User menu */}
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar
              alt={displayUser?.first_name}
              src={user?.avatar_url}
              sx={{ width: 32, height: 32 }}
            >
              {displayUser?.first_name?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={profileMenuAnchor}
            open={Boolean(profileMenuAnchor)}
            onClose={handleProfileMenuClose}
            onClick={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => window.location.href = '/profile'}>
              <ProfileIcon sx={{ mr: 2 }} />
              Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 2 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0, // Remove padding to let pages control their own spacing
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8, // Account for app bar height
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: ninetyColors.background,
        }}
      >
        <Outlet />
      </Box>
      
      {/* Notifications Panel */}
      <NotificationPanel
        open={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />
    </Box>
  );
};

export default Layout;
