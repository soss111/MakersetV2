/**
 * Health Banner Component
 * Shows banner when API is down
 */

import React, { useState, useEffect } from 'react';
import { Alert, Box } from '@mui/material';
import { apiClient } from '../lib/api-client';

export function HealthBanner() {
  const [isHealthy, setIsHealthy] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await apiClient.get('/health');
        setIsHealthy(true);
      } catch (error) {
        setIsHealthy(false);
      } finally {
        setChecking(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (checking || isHealthy) {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert severity="error" sx={{ borderRadius: 0 }}>
        API connection lost. Some features may not work properly.
      </Alert>
    </Box>
  );
}
