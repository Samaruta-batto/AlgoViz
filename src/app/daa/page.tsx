"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Rewind, FastForward, BotMessageSquare, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Node, HistoryStep } from '@/lib/types';
import { insertBST, deleteBST } from '@/lib/algorithms/bst';
import { insertRBTree, deleteRBTree } from '@/lib/algorithms/rbt';
import { insertBTree, deleteBTree } from '@/lib/algorithms/btree';
import { insertHeap, deleteHeap } from '@/lib/algorithms/heap';
import { insertBinomialHeap, deleteBinomialHeap } from '@/lib/algorithms/binomialHeap';
import { drawTree, CANVAS_WIDTH } from '@/lib/drawing';


const TreeVisualizer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [treeType, setTreeType] = useState<'RedBlackTree' | 'BST' | 'BTree' | 'Heap' | 'BinomialHeap'>('RedBlackTree');
    const [history, setHistory] = useState<HistoryStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [bTreeOrder, setBTreeOrder] = useState(3);
    const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    const currentStep = useMemo(() => {
        return history[currentStepIndex] || null;
    }, [history, currentStepIndex]);
    
    const currentTree = useMemo(() => {
        return currentStep?.tree || null;
    }, [currentStep]);


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawTree(ctx, currentStep, treeType, bTreeOrder);
    }, [currentStep, treeType, bTreeOrder]);

    const cleanupAnimation = useCallback(() => {
        if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
            setIsAnimating(false);
        }
    }, []);

    useEffect(() => {
        return cleanupAnimation;
    }, [cleanupAnimation]);

    const stepForward = useCallback(() => {
        if (currentStepIndex < history.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setIsAnimating(false);
            if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
                animationIntervalRef.current = null;
            }
        }
    }, [currentStepIndex, history.length]);

    const stepBack = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex]);

    const playAnimation = useCallback(() => {
        if (history.length === 0) {
             toast({
                variant: "destructive",
                title: "No Operation Performed",
                description: "Please insert or delete a node first.",
            });
            return;
        };

        if (isAnimating) {
            cleanupAnimation();
            return;
        }

        if (currentStepIndex >= history.length - 1) {
            setCurrentStepIndex(0); // Restart if at the end
        }

        setIsAnimating(true);
        animationIntervalRef.current = setInterval(() => {
            stepForward();
        }, 800);
    }, [isAnimating, currentStepIndex, history.length, cleanupAnimation, stepForward, toast]);
    
    useEffect(() => {
        if(isAnimating && currentStepIndex === history.length - 1) {
            cleanupAnimation();
            toast({
                title: "Animation Finished",
                description: "The visualization has reached its final state.",
            });
        }
    }, [currentStepIndex, history.length, isAnimating, cleanupAnimation, toast]);


    const handleOperation = (operation: 'insert' | 'delete') => {
        cleanupAnimation();
        const value = parseInt(inputValue, 10);
        if (isNaN(value) && operation === 'insert') {
            toast({
                variant: "destructive",
                title: "Invalid Input",
                description: "Please enter a valid number for insertion.",
            });
            return;
        }
        
        // For delete operations that don't require a value (e.g., extract-min)
        if (operation === 'delete' && (treeType === 'Heap' || treeType === 'BinomialHeap')) {
             if (inputValue !== '') {
                toast({
                    title: "Input Ignored",
                    description: `Delete operation for ${treeType} is always 'extract-min'. Input value is ignored.`,
                });
            }
        }

        let newHistory: HistoryStep[] = [];
        let operationName = '';

        try {
            switch (treeType) {
                case 'BST':
                    operationName = `BST ${operation}`;
                    if (operation === 'insert') newHistory = insertBST(currentTree, value);
                    else newHistory = deleteBST(currentTree, value);
                    break;
                case 'RedBlackTree':
                    operationName = `Red-Black Tree ${operation}`;
                    if (operation === 'insert') newHistory = insertRBTree(currentTree, value);
                    else newHistory = deleteRBTree(currentTree, value);
                    break;
                case 'BTree':
                    operationName = `B-Tree ${operation}`;
                    if (operation === 'insert') newHistory = insertBTree(currentTree, value, bTreeOrder);
                    else newHistory = deleteBTree(currentTree, value, bTreeOrder);
                    break;
                case 'Heap':
                     operationName = `Heap ${operation}`;
                     if (operation === 'insert') newHistory = insertHeap(currentTree, value);
                     else newHistory = deleteHeap(currentTree);
                     break;
                case 'BinomialHeap':
                     operationName = `Binomial Heap ${operation}`;
                     if (operation === 'insert') newHistory = insertBinomialHeap(currentTree, value);
                     else newHistory = deleteBinomialHeap(currentTree);
                     break;
            }

            if (newHistory.length > 1) { 
                setHistory(newHistory);
                setCurrentStepIndex(0);
                toast({
                    title: "Operation Initiated",
                    description: `${operationName} of ${value} is ready. Use controls to visualize.`,
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Operation Failed",
                    description: newHistory[0]?.message || `Value ${value} may already exist for insertion or not exist for deletion.`,
                });
            }
        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: e.message || "An unexpected error occurred during the operation."
            });
        }

        setInputValue('');
    };
    
    const handleTreeTypeChange = (type: string) => {
        cleanupAnimation();
        setTreeType(type as 'RedBlackTree' | 'BST' | 'BTree' | 'Heap' | 'BinomialHeap');
        setHistory([]);
        setCurrentStepIndex(-1);
    }

    const handleOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        cleanupAnimation();
        let newOrder = parseInt(e.target.value, 10);
        if (isNaN(newOrder) || newOrder < 2) {
            newOrder = 2;
        }
        if (newOrder > 5) {
             toast({
                variant: "destructive",
                title: `B-Tree Order Too Large`,
                description: `Max order is 5 for performance reasons.`
            });
            newOrder = 5;
        }
        setBTreeOrder(newOrder);
        setHistory([]);
        setCurrentStepIndex(-1);
        toast({
            title: `B-Tree Order Updated`,
            description: `Order set to T=${newOrder}. Tree has been reset.`
        });
    };
    
    const isNavDisabled = history.length === 0;

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 font-sans text-foreground">
            <div className="max-w-7xl mx-auto">
                 <header className="text-center mb-8 relative">
                    <Link href="/" passHref>
                        <Button variant="outline" size="icon" className="absolute top-0 left-0">
                            <Home className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-primary font-headline">DAA Visualizer</h1>
                    <p className="text-muted-foreground mt-2 text-lg">A Data Structure and Algorithm Visualizer</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle>Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Tabs value={treeType} onValueChange={handleTreeTypeChange}>
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="BST">BST</TabsTrigger>
                                    <TabsTrigger value="RedBlackTree">RBT</TabsTrigger>
                                    <TabsTrigger value="BTree">B-Tree</TabsTrigger>
                                    <TabsTrigger value="Heap">Heap</TabsTrigger>
                                    <TabsTrigger value="BinomialHeap">Binomial</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {treeType === 'BTree' && (
                                <div className="space-y-2 rounded-lg border p-4 bg-secondary/30">
                                    <Label htmlFor="btree-order" className="font-semibold text-primary">
                                        B-Tree Order (T)
                                    </Label>
                                    <Input
                                        id="btree-order"
                                        type="number"
                                        value={bTreeOrder}
                                        onChange={handleOrderChange}
                                        min="2"
                                        max="5"
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Min Keys: {bTreeOrder - 1}, Max Keys: {2 * bTreeOrder - 1}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="value-input">Node Value</Label>
                                <div className="flex space-x-2">
                                    <Input
                                        id="value-input"
                                        type="number"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={treeType === 'Heap' || treeType === 'BinomialHeap' ? 'e.g., 42 (or blank for delete)' : 'e.g., 42'}
                                        onKeyDown={(e) => {
                                             if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleOperation('insert');
                                            }
                                        }}
                                    />
                                    <Button onClick={() => handleOperation('insert')} className="bg-green-600 hover:bg-green-700">Insert</Button>
                                    <Button variant="destructive" onClick={() => handleOperation('delete')}>
                                        {treeType === 'Heap' || treeType === 'BinomialHeap' ? 'Extract Min' : 'Delete'}
                                    </Button>
                                </div>
                            </div>
                            
                            <Separator />

                            <div className="space-y-4">
                               <Label>Animation Control</Label>
                                <div className="flex justify-around items-center space-x-2 p-2 rounded-lg bg-secondary/30">
                                    <Button onClick={stepBack} disabled={isNavDisabled || currentStepIndex <= 0} size="icon" variant="ghost">
                                        <Rewind className="h-5 w-5" />
                                    </Button>
                                    
                                    <Button 
                                        onClick={playAnimation} 
                                        disabled={isNavDisabled} 
                                        size="icon" 
                                        className="relative h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg"
                                    >
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75 ${!isAnimating && 'hidden'}`}></span>
                                        <span className="relative">
                                            {isAnimating ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
                                        </span>
                                    </Button>

                                    <Button onClick={stepForward} disabled={isNavDisabled || currentStepIndex >= history.length - 1} size="icon" variant="ghost">
                                        <FastForward className="h-5 w-5" />
                                    </Button>
                                </div>
                                {history.length > 0 && (
                                     <div className="text-center text-sm text-muted-foreground">
                                        Step {currentStepIndex + 1} of {history.length}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-2 space-y-6">
                         <Alert className="border-accent bg-accent/10 dark:bg-accent/20">
                            <BotMessageSquare className="h-4 w-4 text-accent dark:text-sky-300" />
                            <AlertTitle className="text-accent-foreground dark:text-sky-200">Status</AlertTitle>
                            <AlertDescription className="text-accent-foreground/80 dark:text-sky-300/80">
                                {currentStep?.message || "Select a data structure and perform an operation."}
                            </AlertDescription>
                        </Alert>
                        <Card className="overflow-hidden">
                           <CardContent className="p-2 bg-slate-50 dark:bg-slate-900/50">
                                <div className="border border-border rounded-lg overflow-x-auto shadow-inner bg-background">
                                    <canvas
                                        ref={canvasRef}
                                        width={CANVAS_WIDTH}
                                        height={300}
                                        className="transition-all duration-500"
                                        style={{ display: 'block', margin: '0 auto', minWidth: '100%' }}
                                    >
                                        Your browser does not support the HTML canvas tag.
                                    </canvas>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Legend</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600"></div>
                                    <span>Current/Target Node</span>
                                </div>
                                 <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-sky-400 border-2 border-sky-600"></div>
                                    <span>Helper/Swapped Node</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-700"></div>
                                    <span>Red Node (RBT)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-gray-800 border-2 border-black"></div>
                                    <span>Black Node (RBT)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-700"></div>
                                    <span>Default Node State</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TreeVisualizer;
