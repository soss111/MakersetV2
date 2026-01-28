import React from 'react';
import { Container, Typography } from '@mui/material';

export default function CatalogPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Catalog Management
      </Typography>
      <Typography variant="body1">
        Catalog management interface coming soon...
      </Typography>
    </Container>
  );
}
