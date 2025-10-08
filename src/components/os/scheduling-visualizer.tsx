"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Process {
  id: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  remainingTime: number;
  finishTime?: number;
  turnaroundTime?: number;
  waitingTime?: number;
}

interface GanttChartBlock {
  processName: string;
  start: number;
  end: number;
}

const SchedulingVisualizer = () => {
  const [processes, setProcesses] = useState<Process[]>([
    { id: 1, name: 'P1', arrivalTime: 0, burstTime: 8, priority: 2, remainingTime: 8 },
    { id: 2, name: 'P2', arrivalTime: 1, burstTime: 4, priority: 1, remainingTime: 4 },
    { id: 3, name: 'P3', arrivalTime: 2, burstTime: 9, priority: 3, remainingTime: 9 },
    { id: 4, name: 'P4', arrivalTime: 3, burstTime: 5, priority: 2, remainingTime: 5 },
  ]);
  const [nextId, setNextId] = useState(5);
  const [algorithm, setAlgorithm] = useState('FCFS');
  const [quantum, setQuantum] = useState(4);
  const [ganttChart, setGanttChart] = useState<GanttChartBlock[]>([]);
  const [results, setResults] = useState<Process[]>([]);
  const [avgTurnaroundTime, setAvgTurnaroundTime] = useState(0);
  const [avgWaitingTime, setAvgWaitingTime] = useState(0);
  const { toast } = useToast();
  
  const isPriorityBased = useMemo(() => ['Priority', 'Priority-P'].includes(algorithm), [algorithm]);

  const handleAddProcess = () => {
    const newProcess: Process = {
      id: nextId,
      name: `P${nextId}`,
      arrivalTime: 0,
      burstTime: 1,
      priority: 1,
      remainingTime: 1,
    };
    setProcesses([...processes, newProcess]);
    setNextId(nextId + 1);
  };

  const handleRemoveProcess = (id: number) => {
    setProcesses(processes.filter(p => p.id !== id));
  };

  const handleProcessChange = (id: number, field: keyof Omit<Process, 'name' | 'id' | 'remainingTime'>, value: string) => {
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue) || numericValue < 0) return;

    setProcesses(processes.map(p =>
      p.id === id ? { ...p, [field]: numericValue, ...(field === 'burstTime' && { remainingTime: numericValue }) } : p
    ));
  };
  
  const runSimulation = useCallback(() => {
    if (processes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Processes',
        description: 'Please add at least one process to run the simulation.',
      });
      return;
    }
    
    let simProcesses: Process[] = JSON.parse(JSON.stringify(processes));
    simProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    const chart: GanttChartBlock[] = [];
    const finishedProcesses: Process[] = [];
    let currentTime = 0;
    let readyQueue: Process[] = [];
    let processIndex = 0;

    const isPreemptive = ['SRTF', 'RoundRobin', 'Priority-P'].includes(algorithm);

    if (isPreemptive) {
         while (processIndex < simProcesses.length || readyQueue.length > 0) {
            // Add arriving processes to the ready queue
            while (processIndex < simProcesses.length && simProcesses[processIndex].arrivalTime <= currentTime) {
                readyQueue.push(simProcesses[processIndex]);
                processIndex++;
            }
            
            // Sort ready queue based on algorithm
            if (algorithm === 'SRTF') {
                readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
            } else if (algorithm === 'Priority-P') {
                readyQueue.sort((a, b) => a.priority - b.priority);
            }

            if (readyQueue.length > 0) {
                const currentProcess = algorithm === 'RoundRobin' ? readyQueue.shift()! : readyQueue[0];
                if (algorithm !== 'RoundRobin') readyQueue = readyQueue.filter(p => p.id !== currentProcess.id);

                const startTime = currentTime;
                let executeTime = 1;

                if(algorithm === 'RoundRobin') {
                    executeTime = Math.min(currentProcess.remainingTime, quantum);
                }
                
                // Add to Gantt chart
                const lastBlock = chart[chart.length - 1];
                if (lastBlock && lastBlock.processName === currentProcess.name) {
                    lastBlock.end = startTime + executeTime;
                } else {
                    chart.push({ processName: currentProcess.name, start: startTime, end: startTime + executeTime });
                }

                currentProcess.remainingTime -= executeTime;
                currentTime += executeTime;

                if (currentProcess.remainingTime > 0) {
                    if (algorithm === 'RoundRobin') {
                         // Add arriving processes that came during execution
                        while (processIndex < simProcesses.length && simProcesses[processIndex].arrivalTime <= currentTime) {
                            readyQueue.push(simProcesses[processIndex]);
                            processIndex++;
                        }
                        readyQueue.push(currentProcess);
                    } else {
                        readyQueue.push(currentProcess);
                    }
                } else {
                    currentProcess.finishTime = currentTime;
                    currentProcess.turnaroundTime = currentProcess.finishTime - currentProcess.arrivalTime;
                    currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                    finishedProcesses.push(currentProcess);
                }
            } else if (processIndex < simProcesses.length) {
                // Idle time
                const nextArrivalTime = simProcesses[processIndex].arrivalTime;
                 const lastBlock = chart[chart.length - 1];
                 if (lastBlock && lastBlock.processName === 'Idle') {
                     lastBlock.end = nextArrivalTime;
                 } else {
                    chart.push({ processName: 'Idle', start: currentTime, end: nextArrivalTime });
                 }
                currentTime = nextArrivalTime;
            }
        }
    } else { // Non-preemptive algorithms
        while (processIndex < simProcesses.length || readyQueue.length > 0) {
            while (processIndex < simProcesses.length && simProcesses[processIndex].arrivalTime <= currentTime) {
                readyQueue.push(simProcesses[processIndex]);
                processIndex++;
            }
            
            if (algorithm === 'SJF') {
                readyQueue.sort((a,b) => a.burstTime - b.burstTime);
            } else if (algorithm === 'LJF') {
                readyQueue.sort((a, b) => b.burstTime - a.burstTime);
            } else if (algorithm === 'Priority') {
                readyQueue.sort((a, b) => a.priority - b.priority);
            }
            // FCFS is already sorted by arrival time

            if (readyQueue.length > 0) {
                const currentProcess = readyQueue.shift()!;
                const startTime = Math.max(currentTime, currentProcess.arrivalTime);
                const finishTime = startTime + currentProcess.burstTime;

                if(startTime > currentTime) {
                    chart.push({ processName: 'Idle', start: currentTime, end: startTime });
                }

                chart.push({ processName: currentProcess.name, start: startTime, end: finishTime });
                
                currentProcess.finishTime = finishTime;
                currentProcess.turnaroundTime = currentProcess.finishTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                
                finishedProcesses.push(currentProcess);
                currentTime = finishTime;
            } else if (processIndex < simProcesses.length) {
                // Idle time
                const nextArrivalTime = simProcesses[processIndex].arrivalTime;
                if(nextArrivalTime > currentTime) {
                    chart.push({ processName: 'Idle', start: currentTime, end: nextArrivalTime });
                    currentTime = nextArrivalTime;
                }
            }
        }
    }
    
    const totalTurnaround = finishedProcesses.reduce((acc, p) => acc + p.turnaroundTime!, 0);
    const totalWaiting = finishedProcesses.reduce((acc, p) => acc + p.waitingTime!, 0);
    setAvgTurnaroundTime(totalTurnaround / finishedProcesses.length || 0);
    setAvgWaitingTime(totalWaiting / finishedProcesses.length || 0);
    
    setGanttChart(chart);
    setResults(finishedProcesses.sort((a,b) => a.id - b.id));

    toast({
        title: 'Simulation Complete',
        description: `Executed ${algorithm} algorithm.`,
      });

  }, [processes, algorithm, quantum, toast]);
  
  const totalChartTime = useMemo(() => ganttChart.length > 0 ? ganttChart[ganttChart.length-1].end : 0, [ganttChart]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CPU Scheduling</CardTitle>
        <CardDescription>
          Visualize common CPU scheduling algorithms. Add processes, set their properties, and run the simulation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
             <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Process List</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="max-h-72 overflow-y-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Process</TableHead>
                            <TableHead>Arrival</TableHead>
                            <TableHead>Burst</TableHead>
                            {isPriorityBased && <TableHead>Priority</TableHead>}
                            <TableHead className="text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processes.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>
                                <Input type="number" value={p.arrivalTime} onChange={e => handleProcessChange(p.id, 'arrivalTime', e.target.value)} className="h-8 w-16" />
                                </TableCell>
                                <TableCell>
                                <Input type="number" value={p.burstTime} onChange={e => handleProcessChange(p.id, 'burstTime', e.target.value)} className="h-8 w-16" />
                                </TableCell>
                                {isPriorityBased && <TableCell>
                                <Input type="number" value={p.priority} onChange={e => handleProcessChange(p.id, 'priority', e.target.value)} className="h-8 w-16" />
                                </TableCell>}
                                <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveProcess(p.id)} className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    <Button onClick={handleAddProcess} className="mt-4 w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Process
                    </Button>
                 </CardContent>
             </Card>
          </div>
          {/* Settings */}
          <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <label className="font-medium">Algorithm</label>
                        <Select value={algorithm} onValueChange={setAlgorithm}>
                        <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Select Algorithm" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FCFS">First-Come, First-Served</SelectItem>
                            <SelectItem value="SJF">Shortest Job First (Non-Preemptive)</SelectItem>
                            <SelectItem value="SRTF">Shortest Remaining Time First (SJF Preemptive)</SelectItem>
                            <SelectItem value="LJF">Longest Job First (Non-Preemptive)</SelectItem>
                            <SelectItem value="Priority">Priority (Non-Preemptive)</SelectItem>
                            <SelectItem value="Priority-P">Priority (Preemptive)</SelectItem>
                            <SelectItem value="RoundRobin">Round Robin</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    {algorithm === 'RoundRobin' && (
                        <div className="flex items-center justify-between">
                            <label htmlFor="quantum" className="font-medium">Time Quantum</label>
                            <Input
                            id="quantum"
                            type="number"
                            value={quantum}
                            onChange={e => setQuantum(parseInt(e.target.value, 10))}
                            className="h-9 w-24"
                            />
                        </div>
                    )}
                    <Button onClick={runSimulation} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Play className="mr-2 h-4 w-4" /> Run Simulation
                    </Button>
                </CardContent>
            </Card>
          </div>
        </div>

        {/* Results */}
        {ganttChart.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Results</h3>
            {/* Gantt Chart */}
            <div>
              <h4 className="font-semibold mb-2">Gantt Chart</h4>
              <div className="w-full bg-secondary rounded-lg p-2 overflow-x-auto">
                <div className="relative h-12 flex items-center bg-background rounded min-w-max">
                  {ganttChart.map((block, i) => {
                    const widthPercentage = ((block.end - block.start) / totalChartTime) * 100;
                    return (
                      <div
                        key={i}
                        className={`h-full flex items-center justify-center border-r border-border text-center ${block.processName === 'Idle' ? 'bg-muted' : 'bg-primary/20'}`}
                        style={{ width: `${widthPercentage}%` }}
                      >
                        <span className="text-sm font-medium text-foreground px-1 truncate">{block.processName}</span>
                        { widthPercentage > 2 && <span className="absolute text-xs text-muted-foreground" style={{ left: `calc(${(block.end / totalChartTime) * 100}%)`, transform: 'translateX(-50%)' }}>
                            {block.end}
                        </span>}
                      </div>
                    );
                  })}
                   <span className="absolute left-0 bottom-[-20px] text-xs text-muted-foreground">0</span>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div>
                 <h4 className="font-semibold mb-2">Metrics</h4>
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <Card>
                        <CardHeader>
                            <CardDescription>Avg. Turnaround Time</CardDescription>
                            <CardTitle>{avgTurnaroundTime.toFixed(2)}</CardTitle>
                        </CardHeader>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardDescription>Avg. Waiting Time</CardDescription>
                            <CardTitle>{avgWaitingTime.toFixed(2)}</CardTitle>
                        </CardHeader>
                    </Card>
                 </div>

                <Table className="mt-4">
                <TableHeader>
                    <TableRow>
                    <TableHead>Process</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Burst</TableHead>
                    {isPriorityBased && <TableHead>Priority</TableHead>}
                    <TableHead>Finish</TableHead>
                    <TableHead>Turnaround</TableHead>
                    <TableHead>Waiting</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map(p => (
                    <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.arrivalTime}</TableCell>
                        <TableCell>{p.burstTime}</TableCell>
                        {isPriorityBased && <TableCell>{p.priority}</TableCell>}
                        <TableCell>{p.finishTime}</TableCell>
                        <TableCell>{p.turnaroundTime?.toFixed(2)}</TableCell>
                        <TableCell>{p.waitingTime?.toFixed(2)}</TableCell>
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

export default SchedulingVisualizer;

    