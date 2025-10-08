"use client";

import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SchedulingVisualizer from '@/components/os/scheduling-visualizer';
import PageReplacementVisualizer from '@/components/os/page-replacement-visualizer';
import ForkVisualizer from '@/components/os/fork-visualizer';

const OSVisualizerPage = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 font-sans text-foreground">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 relative">
            <Link href="/" passHref>
                <Button variant="outline" size="icon" className="absolute top-0 left-0">
                    <Home className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary font-headline">OS Visualizer</h1>
            <p className="text-muted-foreground mt-2 text-lg">Simulate Operating System Algorithms</p>
        </header>

        <main>
          <Tabs defaultValue="scheduling" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scheduling">CPU Scheduling</TabsTrigger>
              <TabsTrigger value="page-replacement">Page Replacement</TabsTrigger>
              <TabsTrigger value="fork">Process Management</TabsTrigger>
            </TabsList>
            <TabsContent value="scheduling">
              <SchedulingVisualizer />
            </TabsContent>
            <TabsContent value="page-replacement">
              <PageReplacementVisualizer />
            </TabsContent>
            <TabsContent value="fork">
                <ForkVisualizer />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default OSVisualizerPage;
