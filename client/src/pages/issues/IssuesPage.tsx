import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const IssuesPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Issues
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Issues feature will allow you to track and resolve business problems.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default IssuesPage;
