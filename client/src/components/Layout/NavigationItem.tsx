import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  SvgIconTypeMap,
} from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';

interface NavigationItemProps {
  text: string;
  icon: OverridableComponent<SvgIconTypeMap<{}, "svg">> & { muiName: string };
  path: string;
  onClick?: () => void;
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  text,
  icon: Icon,
  path,
  onClick,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
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
  
  const isActive = location.pathname === path || 
    (path !== '/dashboard' && location.pathname.startsWith(path));

  const handleClick = () => {
    navigate(path);
    if (onClick) {
      onClick();
    }
  };

  return (
    <ListItem disablePadding sx={{ mb: 1 }}>
      <ListItemButton
        onClick={handleClick}
        sx={{
          borderRadius: 1,
          mx: 0,
          py: 1.5,
          px: 2,
          backgroundColor: isActive ? ninetyColors.primary : 'transparent',
          color: isActive ? '#ffffff' : ninetyColors.text.secondary,
          '&:hover': {
            backgroundColor: isActive ? ninetyColors.primary : '#f1f5f9',
            color: isActive ? '#ffffff' : ninetyColors.text.primary,
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <ListItemIcon
          sx={{
            color: isActive ? '#ffffff' : ninetyColors.text.secondary,
            minWidth: 36,
          }}
        >
          <Icon sx={{ fontSize: '1.25rem' }} />
        </ListItemIcon>
        <ListItemText
          primary={text}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            color: 'inherit',
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default NavigationItem;
