import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const ImportPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Import Data
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The Import feature will allow you to import CSV data from Ninety.io and other sources.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ImportPage;
