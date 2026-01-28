import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

interface DashboardStats {
  users?: number;
  sets?: number;
  providerSets?: number;
  orders?: number;
  pendingOrders?: number;
  totalRevenue?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard - {user?.role === 'admin' ? 'Admin' : user?.role === 'provider' ? 'Provider' : 'Customer'}
      </Typography>

      <Grid container spacing={3}>
        {user?.role === 'admin' && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">Users</Typography>
                <Typography variant="h4">{stats.users || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">Sets</Typography>
                <Typography variant="h4">{stats.sets || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">Provider Sets</Typography>
                <Typography variant="h4">{stats.providerSets || 0}</Typography>
              </Paper>
            </Grid>
          </>
        )}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Orders</Typography>
            <Typography variant="h4">{stats.orders || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Pending Orders</Typography>
            <Typography variant="h4">{stats.pendingOrders || 0}</Typography>
          </Paper>
        </Grid>
        {(user?.role === 'admin' || user?.role === 'provider') && (
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">Total Revenue</Typography>
              <Typography variant="h4">${(stats.totalRevenue || 0).toFixed(2)}</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
