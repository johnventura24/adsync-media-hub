import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  GetApp as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface UploadResult {
  success: boolean;
  filename: string;
  totalRows: number;
  validRows: number;
  errors: string[];
  preview: any[];
}

interface ImportType {
  type: string;
  name: string;
  description: string;
  fields: string[];
}

const ImportPage: React.FC = () => {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState('');
  const [preUploadType, setPreUploadType] = useState(''); // Type selected before upload
  const [importTypes, setImportTypes] = useState<ImportType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load import types on component mount
  React.useEffect(() => {
    loadImportTypes();
  }, []);

  const loadImportTypes = async () => {
    try {
      console.log('Loading import types...');
      setLoadingTypes(true);
      const response = await api.get('/csv/import-types');
      console.log('Import types response:', response.data);
      setImportTypes(response.data.types || []);
    } catch (error) {
      console.error('Failed to load import types:', error);
      // Set fallback import types if API fails
      setImportTypes([
        { type: 'scorecards', name: 'Scorecards', description: 'Import scorecards and KPI tracking data', fields: [] },
        { type: 'rocks', name: 'Rocks (Goals)', description: 'Import quarterly goals and objectives', fields: [] },
        { type: 'todos', name: 'To-Dos', description: 'Import tasks and action items', fields: [] },
        { type: 'issues', name: 'Issues', description: 'Import business issues and problems', fields: [] },
        { type: 'users', name: 'Users', description: 'Import user accounts and profiles', fields: [] },
        { type: 'generic', name: 'Generic Data', description: 'Import any CSV data with flexible structure', fields: [] }
      ]);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!preUploadType) {
      alert('Please select a data type before uploading the file.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('type', preUploadType); // Include the selected type

    try {
      const response = await api.post('/csv/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      setSelectedImportType(preUploadType); // Set the import type from pre-selection
      if (response.data.success && response.data.validRows > 0) {
        setImportDialogOpen(true);
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        filename: file.name,
        totalRows: 0,
        validRows: 0,
        errors: [error.response?.data?.error || 'Upload failed'],
        preview: [],
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!uploadResult || !selectedImportType) return;

    setIsImporting(true);
    try {
      const response = await api.post('/csv/import', {
        filename: uploadResult.filename,
        type: selectedImportType,
        organizationId: 'demo-org-id', // Use mock organization ID
      });

      // Show success message
      alert(`Import successful! ${response.data.imported} records imported.`);
      setImportDialogOpen(false);
      setUploadResult(null);
      setSelectedImportType('');
      setPreUploadType('');
    } catch (error: any) {
      alert(`Import failed: ${error.response?.data?.error || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async (type: string) => {
    try {
      const response = await api.get(`/csv/template/${type}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_template.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

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
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            mb: 1, 
            color: ninetyColors.text.primary,
            fontSize: '2rem'
          }}
        >
          Import Data
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: ninetyColors.text.secondary,
            fontSize: '1rem'
          }}
        >
          Import your data from CSV files or other EOS platforms
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            backgroundColor: ninetyColors.cardBackground,
            border: `1px solid ${ninetyColors.border}`,
            borderRadius: 1,
            boxShadow: 'none',
            height: 'fit-content'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ 
                fontWeight: 600, 
                color: ninetyColors.text.primary,
                fontSize: '1.125rem'
              }}>
                Upload CSV File
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select your data type and upload your Ninety.io export file
              </Typography>
              
              {/* Data Type Selection */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Data Type</InputLabel>
                <Select
                  value={preUploadType}
                  onChange={(e) => setPreUploadType(e.target.value)}
                  label="Select Data Type"
                  disabled={loadingTypes}
                  sx={{ borderRadius: 2 }}
                >
                  {loadingTypes ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        Loading data types...
                      </Typography>
                    </MenuItem>
                  ) : importTypes.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        No data types available
                      </Typography>
                    </MenuItem>
                  ) : (
                    importTypes.map((type) => (
                      <MenuItem key={type.type} value={type.type}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {type.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {type.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !preUploadType}
                  sx={{ 
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  {isUploading ? 'Uploading...' : 'Choose File (CSV or Excel)'}
                </Button>
                
                {!preUploadType && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Select a data type first
                  </Typography>
                )}
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Supports: CSV (.csv), Excel (.xlsx, .xls)
                </Typography>
                
                {isUploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress />
                  </Box>
                )}
              </Box>

              {uploadResult && (
                <Alert 
                  severity={uploadResult.success ? 'success' : 'error'} 
                  sx={{ mt: 2 }}
                >
                  <Typography variant="subtitle2">
                    File: {uploadResult.filename}
                  </Typography>
                  <Typography variant="body2">
                    Total rows: {uploadResult.totalRows}, Valid rows: {uploadResult.validRows}
                  </Typography>
                  {uploadResult.errors.length > 0 && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Errors: {uploadResult.errors.join(', ')}
                    </Typography>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Templates Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2, height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
                📋 Download Templates
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Get the correct CSV format for each data type to ensure successful imports.
              </Typography>

              <List>
                {importTypes.map((type) => (
                  <ListItem key={type.type} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <InfoIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={type.name}
                      secondary={type.description}
                    />
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadTemplate(type.type)}
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500
                      }}
                    >
                      Download
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12}>
          <Card sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#333' }}>
                🚀 Import Instructions
              </Typography>
              
              <Typography variant="body1" paragraph color="text.secondary">
                Follow these simple steps to migrate your data from Ninety.io:
              </Typography>

              <Box component="ol" sx={{ pl: 2 }}>
                <Box component="li" sx={{ mb: 1 }}>
                  <strong>Export from Ninety.io:</strong> Go to your Ninety.io dashboard and export your data as CSV files.
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <strong>Download Template:</strong> Download the appropriate CSV template for the data type you want to import.
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <strong>Format Your Data:</strong> Match your CSV columns to the template format.
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <strong>Upload & Preview:</strong> Upload your CSV file to validate and preview the data.
                </Box>
                <Box component="li" sx={{ mb: 1 }}>
                  <strong>Import:</strong> Select the data type and import your records.
                </Box>
              </Box>

              <Alert 
                severity="info" 
                sx={{ 
                  mt: 3, 
                  borderRadius: 2,
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #1976d2'
                }}
              >
                <Typography variant="body2">
                  <strong>✅ Supported Data Types:</strong> Users, Rocks (Quarterly Goals), To-Dos, Issues, L10 Meetings, Scorecards, and Process Documentation.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>💡 Pro Tip:</strong> You can upload any CSV structure - our system will automatically map common column names!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Data</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            File uploaded successfully! Please select the data type to import:
          </Typography>

          <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
            <InputLabel>Import Type</InputLabel>
            <Select
              value={selectedImportType}
              onChange={(e) => setSelectedImportType(e.target.value)}
              label="Import Type"
            >
              {importTypes.map((type) => (
                <MenuItem key={type.type} value={type.type}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {uploadResult && uploadResult.preview.length > 0 && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Data Preview (first 5 rows):
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {Object.keys(uploadResult.preview[0]).map((key) => (
                        <TableCell key={key}>{key}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadResult.preview.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <TableCell key={cellIndex}>{String(value)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!selectedImportType || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImportPage;
