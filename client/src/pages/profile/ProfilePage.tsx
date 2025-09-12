import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Profile
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Profile feature will allow you to manage your personal information and settings.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;
