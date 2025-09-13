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
  const [importTypes, setImportTypes] = useState<ImportType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load import types on component mount
  React.useEffect(() => {
    loadImportTypes();
  }, []);

  const loadImportTypes = async () => {
    try {
      const response = await api.get('/csv/import-types');
      setImportTypes(response.data.types);
    } catch (error) {
      console.error('Failed to load import types:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await api.post('/csv/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
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
        importType: selectedImportType,
      });

      // Show success message
      alert(`Import successful! ${response.data.imported} records imported.`);
      setImportDialogOpen(false);
      setUploadResult(null);
      setSelectedImportType('');
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

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Import Data
      </Typography>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload CSV File
              </Typography>
              
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Choose CSV File'}
                </Button>
                
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Download Templates
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download CSV templates for different data types to ensure proper formatting.
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
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Instructions
              </Typography>
              
              <Typography variant="body1" paragraph>
                Follow these steps to import your data from Ninety.io or other sources:
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

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Supported Data Types:</strong> Users, Rocks (Goals), To-Dos, Issues, Meetings, Scorecards, and Processes.
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
