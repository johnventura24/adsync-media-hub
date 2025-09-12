import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const RocksPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Rocks (Quarterly Goals)
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Rocks feature will allow you to manage quarterly goals and track progress.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RocksPage;
