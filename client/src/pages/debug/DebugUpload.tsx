import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { api } from '../../services/api';

const DebugUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setDebugResult(null);

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await api.post('/csv/debug-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDebugResult(response.data);
    } catch (error: any) {
      setDebugResult({
        success: false,
        error: 'Network error',
        debug: error.response?.data || error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
        Debug File Upload
      </Typography>
      <Typography variant="body1" sx={{ color: '#64748b', mb: 4 }}>
        This tool will analyze your file and show detailed debugging information
      </Typography>

      <Card sx={{ 
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 1,
        boxShadow: 'none',
        mb: 3
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            
            <Button
              variant="contained"
              size="large"
              startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              sx={{ 
                background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
                borderRadius: 1,
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              {isUploading ? 'Analyzing...' : 'Choose File to Debug'}
            </Button>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Upload your problematic file to see detailed analysis
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {debugResult && (
        <Card sx={{ 
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 1,
          boxShadow: 'none'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Debug Results
            </Typography>

            <Alert 
              severity={debugResult.success ? 'success' : 'error'} 
              sx={{ mb: 3, borderRadius: 1 }}
            >
              {debugResult.success ? 'File parsed successfully!' : `Upload failed: ${debugResult.error}`}
            </Alert>

            {debugResult.debug && (
              <Box>
                {/* File Info */}
                {debugResult.debug.fileInfo && (
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f8fafc' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      File Information:
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {JSON.stringify(debugResult.debug.fileInfo, null, 2)}
                    </Typography>
                  </Paper>
                )}

                {/* Content Info */}
                {debugResult.debug.content && (
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f8fafc' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      File Content Analysis:
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      Text Length: {debugResult.debug.content.textLength} characters
                      {'\n'}Hex Preview: {debugResult.debug.content.hexPreview}
                      {'\n'}Text Preview: {debugResult.debug.content.textPreview}
                    </Typography>
                  </Paper>
                )}

                {/* Parsing Results */}
                {debugResult.debug.parsing && (
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f8fafc' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Parsing Results:
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {JSON.stringify(debugResult.debug.parsing, null, 2)}
                    </Typography>
                  </Paper>
                )}

                {/* Raw Debug Data */}
                <Paper sx={{ p: 2, backgroundColor: '#f1f5f9' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Complete Debug Data:
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem',
                    maxHeight: 300,
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(debugResult, null, 2)}
                  </Typography>
                </Paper>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DebugUpload;
