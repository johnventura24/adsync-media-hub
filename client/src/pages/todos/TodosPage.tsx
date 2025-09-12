import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

const TodosPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        To-Dos
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            This page is under construction. The To-Dos feature will allow you to manage tasks and action items.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TodosPage;
