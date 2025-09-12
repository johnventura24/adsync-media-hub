import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Settings feature will allow you to configure application preferences.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPage;
