// src/components/ShiftDrawer.jsx
import React from 'react';
import { Drawer, Box, Typography, Grid, Button, Divider, Chip } from '@mui/material';
import { format } from 'date-fns';
import { Person } from '@mui/icons-material';

export default function ShiftDrawer({ open, onClose, jobs, members, selectedDate, onAddShift }) {
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}>
      <Box sx={{ p: 3, maxHeight: '80vh', overflowY: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          {selectedDate && format(selectedDate, 'M月d日')}のシフトを追加
        </Typography>

        {members.map((member) => {
          const memberJobs = jobs.filter(j => j.memberId === member.id);
          if (memberJobs.length === 0) return null;

          return (
            <Box key={member.id} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Person sx={{ mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="subtitle1" fontWeight="bold">{member.name}</Typography>
              </Box>
              <Grid container spacing={2}>
                {memberJobs.map(job => (
                  <Grid item xs={6} key={job.id}>
                    <Button 
                      fullWidth variant="contained" 
                      onClick={() => onAddShift(job)}
                      sx={{ 
                        bgcolor: job.color, height: 60, // 高さを少し広げた
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        boxShadow: 'none', '&:hover': { bgcolor: job.color, opacity: 0.9 }
                      }}
                    >
                      <Typography fontWeight="bold" variant="body2">{job.name}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: 10 }}>
                        {job.type === 'manual' ? '金額入力' : `${job.defaultStart || '09:00'} - ${job.defaultEnd || '17:00'}`}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ mt: 2 }} />
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
}