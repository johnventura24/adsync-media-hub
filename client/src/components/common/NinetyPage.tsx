import React from 'react';
import { Box, Typography, Card, CardContent, Button, Alert } from '@mui/material';
import { Add as AddIcon, ArrowBack as BackIcon } from '@mui/icons-material';

interface NinetyPageProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  showAddButton?: boolean;
  onAddClick?: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const NinetyPage: React.FC<NinetyPageProps> = ({
  title,
  subtitle,
  children,
  showAddButton = false,
  onAddClick,
  showBackButton = false,
  onBackClick,
}) => {
  // Ninety.io color scheme
  const ninetyColors = {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#f8fafc',
    cardBackground: '#ffffff',
    border: '#e2e8f0',
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      muted: '#94a3b8'
    }
  };

  return (
    <Box sx={{ backgroundColor: ninetyColors.background, minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showBackButton && (
            <Button
              startIcon={<BackIcon />}
              onClick={onBackClick}
              sx={{ 
                color: ninetyColors.text.secondary,
                textTransform: 'none',
                fontSize: '0.875rem'
              }}
            >
              Back
            </Button>
          )}
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                mb: 0.5, 
                color: ninetyColors.text.primary,
                fontSize: '2rem'
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: ninetyColors.text.secondary,
                fontSize: '1rem'
              }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Box>
        
        {showAddButton && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddClick}
            sx={{ 
              backgroundColor: ninetyColors.primary,
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: ninetyColors.primary,
                boxShadow: 'none'
              }
            }}
          >
            Add New
          </Button>
        )}
      </Box>

      {/* Content */}
      {children ? (
        children
      ) : (
        <Card sx={{ 
          backgroundColor: ninetyColors.cardBackground,
          border: `1px solid ${ninetyColors.border}`,
          borderRadius: 1,
          boxShadow: 'none'
        }}>
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            <Alert 
              severity="info" 
              sx={{ 
                backgroundColor: '#e0f2fe',
                border: `1px solid ${ninetyColors.primary}`,
                borderRadius: 1,
                mb: 3
              }}
            >
              This page is under development. For now, you can view and manage this data from the Data tab.
            </Alert>
            
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                mb: 2, 
                color: ninetyColors.text.primary 
              }}
            >
              Coming Soon
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                color: ninetyColors.text.secondary,
                mb: 3
              }}
            >
              This dedicated {title.toLowerCase()} management page will include advanced features like:
            </Typography>
            
            <Box component="ul" sx={{ 
              textAlign: 'left', 
              maxWidth: 400, 
              mx: 'auto',
              color: ninetyColors.text.secondary 
            }}>
              <li>Create and edit {title.toLowerCase()}</li>
              <li>Advanced filtering and search</li>
              <li>Bulk operations</li>
              <li>Export and reporting</li>
              <li>Team collaboration features</li>
            </Box>
            
            <Button
              variant="outlined"
              onClick={() => window.location.href = '/data'}
              sx={{ 
                mt: 3,
                borderColor: ninetyColors.border,
                color: ninetyColors.text.secondary,
                textTransform: 'none',
                '&:hover': {
                  borderColor: ninetyColors.primary,
                  color: ninetyColors.primary
                }
              }}
            >
              View in Data Tab
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default NinetyPage;
