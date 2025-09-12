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
  
  const isActive = location.pathname === path || 
    (path !== '/dashboard' && location.pathname.startsWith(path));

  const handleClick = () => {
    navigate(path);
    if (onClick) {
      onClick();
    }
  };

  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={handleClick}
        sx={{
          borderRadius: 1,
          mx: 0.5,
          bgcolor: isActive ? 'primary.main' : 'transparent',
          color: isActive ? 'primary.contrastText' : 'text.primary',
          '&:hover': {
            bgcolor: isActive ? 'primary.dark' : 'action.hover',
          },
        }}
      >
        <ListItemIcon
          sx={{
            color: isActive ? 'primary.contrastText' : 'text.secondary',
            minWidth: 40,
          }}
        >
          <Icon />
        </ListItemIcon>
        <ListItemText
          primary={text}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 400,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default NavigationItem;
