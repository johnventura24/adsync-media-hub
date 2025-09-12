import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const ProcessesPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Processes
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Processes feature will allow you to document and track business processes.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProcessesPage;
