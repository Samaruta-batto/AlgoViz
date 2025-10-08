"use client";

import React from 'react';
import Link from 'next/link';
import { Home, Construction } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const OSVisualizerPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-foreground">
      <div className="max-w-4xl w-full text-center">
        <header className="mb-8 relative">
            <Link href="/" passHref>
                <Button variant="outline" size="icon" className="absolute top-0 left-0">
                    <Home className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary font-headline">OS Visualizer</h1>
            <p className="text-muted-foreground mt-2 text-lg">Simulate Operating System Algorithms</p>
        </header>

        <main>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-3">
                <Construction className="h-10 w-10 text-accent" />
                 <span className="text-3xl">Under Construction</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This section is currently being built. Soon, you'll be able to visualize CPU scheduling algorithms like FCFS, SJF, and Round Robin, as well as page replacement algorithms like LRU and FIFO.
              </p>
              <Link href="/" passHref>
                <Button className="mt-6">Back to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default OSVisualizerPage;
