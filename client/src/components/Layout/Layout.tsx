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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Hub Dashboard
        </Typography>
      </Box>
      
      <Divider />
      
      {/* Organization Selector */}
      <Box sx={{ p: 2 }}>
        <OrganizationSelector />
      </Box>
      
      <Divider />
      
      {/* Navigation */}
      <List sx={{ flexGrow: 1, px: 1 }}>
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
          bgcolor: 'background.paper',
          color: 'text.primary',
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
              alt={user?.first_name}
              src={user?.avatar_url}
              sx={{ width: 32, height: 32 }}
            >
              {user?.first_name?.[0]?.toUpperCase()}
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
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8, // Account for app bar height
          minHeight: 'calc(100vh - 64px)',
          bgcolor: 'background.default',
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
