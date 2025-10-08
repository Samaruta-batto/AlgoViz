"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Play } from 'lucide-react';

type FrameState = (number | null)[];
type Step = {
  page: number;
  frames: FrameState;
  fault: boolean;
};

const PageReplacementVisualizer = () => {
  const [referenceString, setReferenceString] = useState('1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5');
  const [frameCount, setFrameCount] = useState(3);
  const [algorithm, setAlgorithm] = useState('FIFO');
  const [simulationSteps, setSimulationSteps] = useState<Step[]>([]);
  const { toast } = useToast();

  const handleRunSimulation = () => {
    const pages = referenceString.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (pages.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid Reference String' });
      return;
    }
    if (frameCount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Frame Count' });
      return;
    }

    const steps: Step[] = [];
    const frames: number[] = [];
    let pageFaults = 0;
    const pageUsage: number[] = []; // For LRU

    for (const page of pages) {
      let fault = false;
      if (!frames.includes(page)) {
        fault = true;
        pageFaults++;
        if (frames.length < frameCount) {
          frames.push(page);
        } else {
          if (algorithm === 'FIFO') {
            frames.shift();
            frames.push(page);
          } else if (algorithm === 'LRU') {
            const lruPage = pageUsage.reduce((lru, current) => {
                const lruIndex = frames.indexOf(lru);
                const currentIndex = frames.indexOf(current);
                return lruIndex < currentIndex ? lru : current;
            });
            const indexToReplace = frames.indexOf(lruPage);
            frames[indexToReplace] = page;
          }
        }
      }
      
      // Update usage for LRU
      const usageIndex = pageUsage.indexOf(page);
      if (usageIndex > -1) {
        pageUsage.splice(usageIndex, 1);
      }
      pageUsage.push(page);


      const currentFrameState: FrameState = Array(frameCount).fill(null);
      frames.forEach((p, i) => currentFrameState[i] = p);
      steps.push({ page, frames: currentFrameState, fault });
    }

    setSimulationSteps(steps);
    toast({ title: 'Simulation Complete', description: `${pageFaults} page faults occurred.` });
  };
  
  const { pageFaults, hitRate } = useMemo(() => {
      if (simulationSteps.length === 0) return { pageFaults: 0, hitRate: 0 };
      const faults = simulationSteps.filter(s => s.fault).length;
      const hits = simulationSteps.length - faults;
      return {
          pageFaults: faults,
          hitRate: (hits / simulationSteps.length) * 100,
      };
  }, [simulationSteps])


  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Replacement Algorithms</CardTitle>
        <CardDescription>
          Visualize how different algorithms handle page faults in memory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle className="text-lg">Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="ref-string">Page Reference String</Label>
                        <Input
                            id="ref-string"
                            value={referenceString}
                            onChange={(e) => setReferenceString(e.target.value)}
                            placeholder="e.g., 1, 2, 3, 4, 1, 2, 5"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="frame-count">Number of Frames</Label>
                        <Input
                            id="frame-count"
                            type="number"
                            value={frameCount}
                            onChange={(e) => setFrameCount(Math.max(1, parseInt(e.target.value, 10)))}
                            min="1"
                        />
                     </div>
                      <div className="space-y-2">
                        <Label>Algorithm</Label>
                        <Select value={algorithm} onValueChange={setAlgorithm}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Algorithm" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FIFO">First-In, First-Out (FIFO)</SelectItem>
                                <SelectItem value="LRU">Least Recently Used (LRU)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <Button onClick={handleRunSimulation} className="w-full">
                        <Play className="mr-2 h-4 w-4" /> Run Simulation
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-lg">Metrics</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-around text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Page Faults</p>
                            <p className="text-3xl font-bold">{pageFaults}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Hit Rate</p>
                            <p className="text-3xl font-bold">{hitRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        {simulationSteps.length > 0 && (
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Results</h3>
                 <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">Page</TableHead>
                                {Array.from({ length: frameCount }, (_, i) => (
                                    <TableHead key={i} className="text-center">Frame {i + 1}</TableHead>
                                ))}
                                <TableHead className="text-center w-24">Fault?</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {simulationSteps.map((step, stepIndex) => (
                                <TableRow key={stepIndex}>
                                    <TableCell className="font-bold text-primary text-lg">{step.page}</TableCell>
                                    {step.frames.map((framePage, frameIndex) => (
                                        <TableCell key={frameIndex} className="text-center text-lg font-mono">
                                            {framePage !== null ? framePage : '-'}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${step.fault ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {step.fault ? 'Yes' : 'No'}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            </div>
        )}

      </CardContent>
    </Card>
  );
};

export default PageReplacementVisualizer;

    