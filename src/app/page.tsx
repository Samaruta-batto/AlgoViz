"use client";

import React from 'react';
import Link from 'next/link';
import { BookOpen, Cpu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-foreground">
      <header className="text-center mb-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-primary font-headline tracking-tighter">AlgoViz Suite</h1>
        <p className="text-muted-foreground mt-3 text-xl">
          An Interactive Suite for Visualizing Complex Algorithms
        </p>
      </header>

      <main className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link href="/daa" passHref>
          <Card className="hover:border-primary/80 hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-accent" />
                <span className="text-2xl font-bold">DAA Visualizer</span>
              </CardTitle>
              <CardDescription>
                Explore and understand fundamental data structures and algorithms.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Binary Search Trees (BST)</li>
                <li>Red-Black Trees (RBT)</li>
                <li>B-Trees</li>
                <li>Heaps & Binomial Heaps</li>
              </ul>
            </CardContent>
             <div className="p-6 pt-0">
                <Button className="w-full" variant="outline">Go to DAA Visualizer &rarr;</Button>
            </div>
          </Card>
        </Link>

        <Link href="/os" passHref>
          <Card className="hover:border-primary/80 hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Cpu className="h-8 w-8 text-accent" />
                <span className="text-2xl font-bold">OS Visualizer</span>
              </CardTitle>
              <CardDescription>
                Simulate classic operating system concepts like scheduling and memory management.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>CPU Scheduling Algorithms</li>
                <li>Page Replacement Algorithms</li>
                <li>(Coming Soon!)</li>
              </ul>
            </CardContent>
            <div className="p-6 pt-0">
                <Button className="w-full" variant="outline">Go to OS Visualizer &rarr;</Button>
            </div>
          </Card>
        </Link>
      </main>
      
      <footer className="text-center mt-12 text-sm text-muted-foreground">
        <p>Select a visualizer to get started.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
