"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Construction } from 'lucide-react';

const ForkVisualizer = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Construction className="h-6 w-6 text-accent" />
          fork() System Call
        </CardTitle>
        <CardDescription>
          Visualize the process creation hierarchy from the fork() system call. This component is currently under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-10 bg-secondary/30 rounded-lg">
          <Construction className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">Coming Soon!</p>
          <p>We're working on bringing this feature to life.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForkVisualizer;
