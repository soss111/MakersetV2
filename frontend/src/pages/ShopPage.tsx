import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
} from '@mui/material';
import { apiClient } from '../lib/api-client';

interface ShopSet {
  provider_set_id: string;
  provider_id: string;
  set_id: string;
  price: number;
  available_quantity: number;
  set_name: string;
  set_description: string;
  set_category: string;
  difficulty_level: string;
  provider_name: string;
}

export default function ShopPage() {
  const [sets, setSets] = useState<ShopSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      const response = await apiClient.get('/shop-sets', {
        params: { search, limit: 20 },
      });
      setSets(response.data.items || []);
    } catch (error) {
      console.error('Failed to load sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    loadSets();
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
        Shop
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="Search sets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      <Grid container spacing={3}>
        {sets.map((set) => (
          <Grid item xs={12} sm={6} md={4} key={set.provider_set_id}>
            <Card>
              {set.set_image_url && (
                <CardMedia
                  component="img"
                  height="200"
                  image={set.set_image_url}
                  alt={set.set_name}
                />
              )}
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {set.set_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {set.provider_name}
                </Typography>
                <Typography variant="body2" paragraph>
                  {set.set_description?.substring(0, 100)}...
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" color="primary">
                    ${set.price.toFixed(2)}
                  </Typography>
                  <Button variant="contained" size="small">
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {sets.length === 0 && !loading && (
        <Typography variant="body1" align="center" sx={{ mt: 4 }}>
          No sets found
        </Typography>
      )}
    </Container>
  );
}
