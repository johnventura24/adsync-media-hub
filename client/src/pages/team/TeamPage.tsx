import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const TeamPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Team
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Team feature will allow you to manage team members and accountability charts.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TeamPage;
