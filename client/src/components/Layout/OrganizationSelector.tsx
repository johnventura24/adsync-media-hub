import React from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Avatar,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';

import { useOrganization } from '../../contexts/OrganizationContext';

const OrganizationSelector: React.FC = () => {
  const { currentOrganization, userOrganizations, setCurrentOrganization } = useOrganization();
  
  if (userOrganizations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No organizations available
        </Typography>
      </Box>
    );
  }

  if (userOrganizations.length === 1) {
    // If user only has one organization, show it without selector
    const org = userOrganizations[0];
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
        <Avatar
          src={org.organizations.logo_url}
          sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
        >
          <BusinessIcon sx={{ fontSize: 20 }} />
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {org.organizations.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
              label={org.role}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: 20 }}
            />
            {org.organizations.industry && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {org.organizations.industry}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <FormControl fullWidth size="small">
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        Organization
      </Typography>
      <Select
        value={currentOrganization?.id || ''}
        onChange={(e) => {
          const selectedOrg = userOrganizations.find(
            org => org.organization_id === e.target.value
          );
          setCurrentOrganization(selectedOrg?.organizations || null);
        }}
        displayEmpty
        renderValue={(value) => {
          if (!value || !currentOrganization) {
            return (
              <Typography variant="body2" color="text.secondary">
                Select organization
              </Typography>
            );
          }
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={currentOrganization.logo_url}
                sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}
              >
                <BusinessIcon sx={{ fontSize: 16 }} />
              </Avatar>
              <Typography variant="body2" noWrap>
                {currentOrganization.name}
              </Typography>
            </Box>
          );
        }}
        sx={{
          '& .MuiSelect-select': {
            py: 1,
          },
        }}
      >
        {userOrganizations.map((userOrg) => (
          <MenuItem key={userOrg.organization_id} value={userOrg.organization_id}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Avatar
                src={userOrg.organizations.logo_url}
                sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}
              >
                <BusinessIcon sx={{ fontSize: 16 }} />
              </Avatar>
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" noWrap>
                {userOrg.organizations.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip
                  label={userOrg.role}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 18 }}
                />
                {userOrg.organizations.industry && (
                  <Typography variant="caption" color="text.secondary">
                    {userOrg.organizations.industry}
                  </Typography>
                )}
              </Box>
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default OrganizationSelector;
