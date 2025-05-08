import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Grid } from '@mui/material';
import { api } from '../services/api';

interface NutritionHistoryProps {
  userId: string;
}

interface Food {
  food: string;
  quantity: number;
  unit: string | null;
  fdcId: number;
}

interface NutritionSummary {
  macros: {
    calories: number;
    fat_g: number;
    carbohydrates_g: number;
    protein_g: number;
  };
  vitamins: {
    calcium_mg: number;
    iron_mg: number;
    potassium_mg: number;
  };
}

interface HistoryRecord {
  userId: string;
  timestamp: string;
  foods: Food[];
  summary: NutritionSummary;
}

export const NutritionHistory: React.FC<NutritionHistoryProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await api.getAnalyze(userId);
        console.log('API Response:', response); // 添加调试日志
        if (response && Array.isArray(response.records)) {
          setHistory(response.records);
        } else {
          setError('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error fetching history:', err); // 添加错误日志
        setError(err instanceof Error ? err.message : '获取历史记录失败');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (err) {
      console.error('Error formatting timestamp:', err);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Nutrition Analysis History
        </Typography>
        <Alert severity="info">No history records found.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Nutrition Analysis History
      </Typography>

      <Grid container spacing={3}>
        {history.map((record, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {formatTimestamp(record.timestamp)}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  Food List:
                </Typography>
                {record.foods && record.foods.map((food: Food, foodIndex: number) => (
                  <Typography key={foodIndex} variant="body2">
                    {food.quantity} {food.unit || ''} {food.food}
                  </Typography>
                ))}

                <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
                  Nutrition Summary:
                </Typography>
                {record.summary && record.summary.macros && (
                  <>
                    <Typography variant="body2">
                      Calories: {record.summary.macros.calories} kcal
                    </Typography>
                    <Typography variant="body2">
                      Protein: {record.summary.macros.protein_g}g
                    </Typography>
                    <Typography variant="body2">
                      Fat: {record.summary.macros.fat_g}g
                    </Typography>
                    <Typography variant="body2">
                      Carbohydrates: {record.summary.macros.carbohydrates_g}g
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}; 