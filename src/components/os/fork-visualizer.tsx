"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Eraser } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ForkProcess } from '@/lib/algorithms/fork';
import { parseAndRunFork } from '@/lib/algorithms/fork';
import { drawProcessTree, CANVAS_WIDTH } from '@/lib/drawing';
import { ScrollArea } from '@/components/ui/scroll-area';

const initialCode = 
`printf("Main Process Started\\n");
fork();
printf("Hello from both!\\n");
if (fork() == 0) {
    printf("Child of Child running...\\n");
} else {
    printf("Parent or Child running...\\n");
}`;

const ForkVisualizer = () => {
  const [code, setCode] = useState(initialCode);
  const [simulationResult, setSimulationResult] = useState<{ rootProcess: ForkProcess; output: string[] } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleRunSimulation = useCallback(() => {
    try {
      const result = parseAndRunFork(code);
      setSimulationResult(result);
      toast({
        title: 'Simulation Complete',
        description: `${result.output.length} lines of output generated.`,
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Parsing Error',
        description: e.message,
      });
      setSimulationResult(null);
    }
  }, [code, toast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationResult) {
      if(canvas){
        const ctx = canvas.getContext('2d');
        if(ctx) ctx.clearRect(0,0, canvas.width, canvas.height);
      }
      return;
    };
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawProcessTree(ctx, simulationResult.rootProcess);
  }, [simulationResult]);
  
  // Run simulation on initial load
  useEffect(() => {
    handleRunSimulation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = () => {
    setCode('');
    setSimulationResult(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>fork() System Call Visualizer</CardTitle>
        <CardDescription>
          Write simple C-like code with fork() calls to see the process creation hierarchy and output.
          Supports `fork()`, `printf()`, and simple `if`/`else` blocks based on `fork()`'s return value.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Code and Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Code Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono h-60 text-sm bg-secondary/30"
                placeholder="Enter your fork() code here..."
              />
              <div className="flex gap-2 mt-4">
                 <Button onClick={handleRunSimulation} className="w-full">
                    <Play className="mr-2 h-4 w-4" /> Run
                </Button>
                <Button onClick={handleClear} variant="outline" className="w-full">
                    <Eraser className="mr-2 h-4 w-4" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle className="text-lg">Program Output</CardTitle>
            </CardHeader>
             <CardContent>
                <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-4">
                    <div className="font-mono text-sm">
                        {simulationResult?.output.map((line, index) => (
                            <p key={index} className="whitespace-pre-wrap">{line}</p>
                        ))}
                    </div>
                </ScrollArea>
             </CardContent>
          </Card>
        </div>

        {/* Right Side: Visualization */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Process Tree</CardTitle>
            </CardHeader>
            <CardContent className="p-2 bg-slate-50 dark:bg-slate-900/50">
                <div className="border border-border rounded-lg overflow-x-auto shadow-inner bg-background">
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={400}
                        className="transition-all duration-500"
                        style={{ display: 'block', margin: '0 auto', minWidth: '100%' }}
                    >
                        Your browser does not support the HTML canvas tag.
                    </canvas>
                </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForkVisualizer;

    