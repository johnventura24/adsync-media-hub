import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const ScorecardsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Scorecards
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Scorecards feature will allow you to track KPIs and metrics.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ScorecardsPage;
