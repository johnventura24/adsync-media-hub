import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const MeetingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Meetings
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Meetings feature will allow you to schedule and manage Level 10 meetings.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MeetingsPage;
