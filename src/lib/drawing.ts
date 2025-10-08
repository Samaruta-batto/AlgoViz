
import { Node, HistoryStep } from './types';
import type { ForkProcess } from './algorithms/fork';


export const CANVAS_WIDTH = 1200;
const NODE_RADIUS = 20;
const LEVEL_HEIGHT = 90;
const B_TREE_NODE_HEIGHT = 40;
const B_TREE_KEY_WIDTH = 40;

// --- Binary Tree / Heap Layout ---
const layoutBinaryTree = (node: Node | null, x: number, y: number, separation: number, depth: number) => {
    if (!node) return;
    
    node.x = x;
    node.y = y + depth * LEVEL_HEIGHT;

    const childSeparation = separation / 2;
    
    if (node.left) {
        layoutBinaryTree(node.left, x - childSeparation, node.y, childSeparation, depth + 1);
    }
    if (node.right) {
        layoutBinaryTree(node.right, x + childSeparation, node.y, childSeparation, depth + 1);
    }
};

// --- B-Tree Layout ---
const layoutBTree = (node: Node | null, depth: number, order: number) => {
    if (!node) return;

    node.y = depth * LEVEL_HEIGHT + (LEVEL_HEIGHT / 2);
    node.width = node.keys.length * B_TREE_KEY_WIDTH + (node.keys.length + 1) * 2;

    if (!node.isLeaf) {
        node.children.forEach(child => layoutBTree(child, depth + 1, order));
    }
};

const positionBTree = (node: Node | null, xOffset: number): number => {
    if (!node) return 0;
    
    if (node.isLeaf) {
        node.x = xOffset + node.width / 2;
        return node.width + B_TREE_KEY_WIDTH;
    }

    let childrenWidth = 0;
    node.children.forEach(child => {
        childrenWidth += positionBTree(child, xOffset + childrenWidth);
    });

    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    
    if (firstChild && lastChild) {
        node.x = (firstChild.x + lastChild.x) / 2;
    } else {
        node.x = xOffset + node.width / 2;
    }
    
    return childrenWidth > 0 ? childrenWidth : node.width + B_TREE_KEY_WIDTH;
};


// --- Binomial Heap Layout ---
const layoutBinomialHeap = (roots: Node[]) => {
    let currentX = NODE_RADIUS * 2;
    roots.forEach(root => {
        const treeWidth = Math.pow(2, root.degree -1) * (NODE_RADIUS * 2.5);
        layoutBinomialTree(root, currentX + treeWidth / 2, NODE_RADIUS);
        currentX += treeWidth + NODE_RADIUS * 3;
    });
};

const layoutBinomialTree = (node: Node, x: number, y: number) => {
    node.x = x;
    node.y = y;

    if (node.child) {
        const children = [];
        let currentChild: Node | null = node.child;
        while(currentChild) {
            children.push(currentChild);
            currentChild = currentChild.sibling;
        }

        const totalWidth = Math.pow(2, node.degree - 2) * (NODE_RADIUS * 4);
        let startX = x - totalWidth;
        if (children.length === 1) {
            startX = x;
        }


        children.reverse().forEach((child, index) => {
            const childTreeWidth = Math.pow(2, child.degree) * (NODE_RADIUS * 2);
            layoutBinomialTree(child, startX + childTreeWidth / 2, y + LEVEL_HEIGHT);
            startX += childTreeWidth + NODE_RADIUS;
        });
    }
};


// --- Main Drawing Function ---
export const drawTree = (ctx: CanvasRenderingContext2D, stepOrRoot: HistoryStep | Node | null, treeType: 'BST' | 'RedBlackTree' | 'BTree' | 'Heap' | 'BinomialHeap', order: number) => {
    const root = (stepOrRoot as HistoryStep)?.tree ?? (stepOrRoot as Node | null);
    let maxDepth = 0;
    
    const calculateDepth = (node: Node | null, depth: number) => {
        if (!node) return;
        maxDepth = Math.max(maxDepth, depth);

        if (node.isBinomialHeap) {
            node.children.forEach(child => calculateDepth(child, depth));
        } else if (treeType === 'BTree' && node.children) {
            node.children.forEach(child => calculateDepth(child, depth + 1));
        } else if (treeType === 'BinomialHeap') {
            if(node.child) calculateDepth(node.child, depth + 1);
            if(node.sibling) calculateDepth(node.sibling, depth);
        }
        else {
            calculateDepth(node.left, depth + 1);
            calculateDepth(node.right, depth + 1);
        }
    };
    calculateDepth(root, 1);
    ctx.canvas.height = Math.max(300, (maxDepth + 1) * LEVEL_HEIGHT);
    

    if (!root) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    let minX = Infinity;
    let maxX = -Infinity;

    const findBoundsAndShift = (node: Node | null, shiftX: number) => {
        if (!node) return;
        node.x += shiftX;

        if (node.isBinomialHeap) {
            node.children.forEach(c => findBoundsAndShift(c, shiftX));
            return;
        }

        const nodeStartX = node.x - (treeType === 'BTree' ? node.width / 2 : NODE_RADIUS);
        const nodeEndX = node.x + (treeType === 'BTree' ? node.width / 2 : NODE_RADIUS);
        minX = Math.min(minX, nodeStartX);
        maxX = Math.max(maxX, nodeEndX);
        
        if (treeType === 'BTree' && node.children) node.children.forEach(c => findBoundsAndShift(c, shiftX));
        else if (treeType === 'BinomialHeap') {
             if(node.child) findBoundsAndShift(node.child, shiftX);
             if(node.sibling) findBoundsAndShift(node.sibling, shiftX);
        }
        else {
            findBoundsAndShift(node.left, shiftX);
            findBoundsAndShift(node.right, shiftX);
        }
    };

    // 1. Recalculate layout
    if (root.isBinomialHeap) {
        layoutBinomialHeap(root.children);
    } else if (treeType === 'BTree') {
        layoutBTree(root, 0, order);
        positionBTree(root, NODE_RADIUS);
    } else { // BST, RBT, Heap
        layoutBinaryTree(root, CANVAS_WIDTH / 2, NODE_RADIUS, CANVAS_WIDTH / 4, 0);
    }
    
    // Find bounds to calculate required width
    minX = Infinity;
    maxX = -Infinity;
    const initialFindBounds = (node: Node) => {
         if (node.isBinomialHeap) {
            node.children.forEach(initialFindBounds);
            return;
        }

        const nodeStartX = node.x - (treeType === 'BTree' ? node.width / 2 : NODE_RADIUS);
        const nodeEndX = node.x + (treeType === 'BTree' ? node.width / 2 : NODE_RADIUS);
        minX = Math.min(minX, nodeStartX);
        maxX = Math.max(maxX, nodeEndX);

        if (treeType === 'BTree' && node.children) node.children.forEach(initialFindBounds);
         else if (treeType === 'BinomialHeap') {
             if(node.child) initialFindBounds(node.child);
             if(node.sibling) initialFindBounds(node.sibling);
        }
        else {
            if(node.left) initialFindBounds(node.left);
            if(node.right) initialFindBounds(node.right);
        }
    };
    initialFindBounds(root);

    const requiredWidth = maxX - minX + (NODE_RADIUS * 2);
    ctx.canvas.width = Math.max(CANVAS_WIDTH, requiredWidth);

    const shiftX = ctx.canvas.width / 2 - (minX + (maxX-minX)/2);
    minX = Infinity;
    maxX = -Infinity;
    findBoundsAndShift(root, shiftX);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);


    // 2. Recursive draw
    const drawRecursive = (node: Node) => {
        if(node.isBinomialHeap) {
            node.children.forEach(drawRecursive);
            return;
        }

        if (treeType === 'BTree') {
            if (!node.isLeaf && node.children) {
                node.children.forEach((child, index) => {
                    ctx.beginPath();
                    const parentKeyWidth = node.keys.length * B_TREE_KEY_WIDTH;
                    const parentStartX = node.x - parentKeyWidth / 2;
                    const lineStartX = parentStartX + index * B_TREE_KEY_WIDTH + (index > 0 ? (index) * 2 : 0) ;
                    ctx.moveTo(lineStartX, node.y + B_TREE_NODE_HEIGHT / 2);
                    ctx.lineTo(child.x, child.y - B_TREE_NODE_HEIGHT / 2);
                    ctx.strokeStyle = '#6b7280';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });
            }
            drawBTreeNode(ctx, node, (stepOrRoot as HistoryStep));
            if (!node.isLeaf && node.children) {
                node.children.forEach(drawRecursive);
            }
        } else if (treeType === 'BinomialHeap') {
            // Draw connection to child
            if (node.child) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.child.x, node.child.y);
                ctx.strokeStyle = '#6b7280';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            // Draw connection to sibling (dashed line)
            if (node.sibling) {
                ctx.save();
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.sibling.x, node.sibling.y);
                ctx.strokeStyle = '#a1a1aa';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
            drawBinaryNode(ctx, node); // Re-use binary node drawing
            if (node.child) drawRecursive(node.child);
            if (node.sibling) drawRecursive(node.sibling);

        }
        else { // BST, RBT, Heap
            [node.left, node.right].forEach(child => {
                if (child) {
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(child.x, child.y);
                    ctx.strokeStyle = '#6b7280';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            });
            drawBinaryNode(ctx, node);
            if (node.left) drawRecursive(node.left);
            if (node.right) drawRecursive(node.right);
        }
    };
    
    drawRecursive(root);
};


const drawBTreeNode = (ctx: CanvasRenderingContext2D, node: Node, step: HistoryStep | null) => {
    if (!node.keys || node.keys.length === 0) return;
    const keyCount = node.keys.length;

    const boxWidth = keyCount * B_TREE_KEY_WIDTH + (keyCount -1) * 2;
    const startX = node.x - boxWidth / 2;
    
    let fillColor = '#10B981';
    let strokeColor = '#047857';

    if(node.highlighted) {
        fillColor = '#FBBF24';
        strokeColor = '#D97706';
    } else if(node.secondaryHighlighted) {
        fillColor = '#38BDF8';
        strokeColor = '#0284C7';
    }

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(startX, node.y - B_TREE_NODE_HEIGHT / 2, boxWidth, B_TREE_NODE_HEIGHT, 8);
    ctx.fill();
    ctx.stroke();
    
    node.keys.forEach((key, index) => {
        const keyStartX = startX + index * (B_TREE_KEY_WIDTH + 2);
        
        if(step?.highlightKey === key) {
            ctx.fillStyle = 'rgba(251, 146, 60, 0.7)';
            ctx.fillRect(keyStartX, node.y - B_TREE_NODE_HEIGHT / 2, B_TREE_KEY_WIDTH, B_TREE_NODE_HEIGHT);
        }

        if (index > 0) {
            ctx.beginPath();
            ctx.moveTo(keyStartX, node.y - B_TREE_NODE_HEIGHT / 2);
            ctx.lineTo(keyStartX, node.y + B_TREE_NODE_HEIGHT / 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key.toString(), keyStartX + B_TREE_KEY_WIDTH / 2, node.y);
    });
}

const drawBinaryNode = (ctx: CanvasRenderingContext2D, node: Node) => {
    let fillColor = node.color === 'red' ? '#EF4444' : node.color === 'black' ? '#1F2937' : '#10B981';
    let strokeColor = node.color === 'red' ? '#B91C1C' : node.color === 'black' ? '#000000' : '#047857';

    if (node.highlighted) {
        fillColor = '#FBBF24';
        strokeColor = '#D97706';
    } else if (node.secondaryHighlighted) {
        fillColor = '#38BDF8';
        strokeColor = '#0284C7';
    }
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.value?.toString() ?? '', node.x, node.y);
};


// --- Fork() Process Tree Drawing ---

const PROCESS_NODE_WIDTH = 120;
const PROCESS_NODE_HEIGHT = 50;

// This function calculates the x-coordinates for each node in a bottom-up fashion
const calculateInitialX = (process: ForkProcess, processMap: Map<number, ForkProcess>): number => {
    if (process.children.length === 0) {
        process.x = 0;
        return PROCESS_NODE_WIDTH + 40; // width of node + margin
    }

    let subtreeWidth = 0;
    process.children.forEach(child => {
        subtreeWidth += calculateInitialX(child, processMap);
    });

    const firstChild = process.children[0];
    const lastChild = process.children[process.children.length - 1];
    
    // Center the parent over its children
    process.x = firstChild.x + (lastChild.x - firstChild.x) / 2;

    return subtreeWidth;
}

// Repositions the subtrees to avoid overlaps
const fixOverlaps = (process: ForkProcess, processMap: Map<number, ForkProcess>) => {
    for (let i = 0; i < process.children.length - 1; i++) {
        const rightContour = getContour(process.children[i], 'right', processMap);
        const leftContour = getContour(process.children[i + 1], 'left', processMap);
        
        let maxShift = 0;
        for (const level in rightContour) {
            if (leftContour[level] !== undefined) {
                const shift = rightContour[level] - leftContour[level];
                maxShift = Math.max(maxShift, shift);
            }
        }

        if (maxShift > 0) {
            const shiftAmount = maxShift + 40; // add margin
            shiftSubtree(process.children[i + 1], shiftAmount, processMap);
        }
    }
}

const getContour = (process: ForkProcess, side: 'left' | 'right', processMap: Map<number, ForkProcess>, contours: {[level: number]: number} = {}, level = 0): {[level: number]: number} => {
    const extremeX = process.x + (side === 'left' ? -PROCESS_NODE_WIDTH / 2 : PROCESS_NODE_WIDTH / 2);
    
    if (contours[level] === undefined || (side === 'left' ? extremeX < contours[level] : extremeX > contours[level])) {
        contours[level] = extremeX;
    }

    process.children.forEach(child => getContour(child, side, processMap, contours, level + 1));
    return contours;
}

const shiftSubtree = (process: ForkProcess, shiftAmount: number, processMap: Map<number, ForkProcess>) => {
    process.x += shiftAmount;
    process.children.forEach(child => shiftSubtree(child, shiftAmount, processMap));
}

const setNodePositions = (process: ForkProcess, depth: number, processMap: Map<number, ForkProcess>) => {
    process.y = depth * (PROCESS_NODE_HEIGHT + 60) + PROCESS_NODE_HEIGHT;

    for (const child of process.children) {
        setNodePositions(child, depth + 1, processMap);
    }
};

export const drawProcessTree = (ctx: CanvasRenderingContext2D, rootProcess: ForkProcess) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!rootProcess) return;

    const processMap = new Map<number, ForkProcess>();
    const queue: ForkProcess[] = [rootProcess];
    let maxDepth = 0;
    
    while(queue.length > 0) {
        const p = queue.shift()!;
        processMap.set(p.pid, p);
        maxDepth = Math.max(maxDepth, p.depth);
        p.children.forEach(child => queue.push(child));
    }
    ctx.canvas.height = Math.max(400, (maxDepth + 1) * (PROCESS_NODE_HEIGHT + 60));


    // This is a simplified version of a tree layout algorithm (e.g., Reingold-Tilford)
    const layout = (process: ForkProcess) => {
        process.children.forEach(layout);
        
        let currentX = 0;
        if(process.children.length > 0) {
            process.children.forEach((child, i) => {
                 shiftSubtree(child, currentX, processMap);
                 const childWidth = getSubtreeWidth(child, processMap);
                 currentX += childWidth;
            });
            fixOverlaps(process, processMap);
        }
    }
    
    setNodePositions(rootProcess, 0, processMap);
    calculateInitialX(rootProcess, processMap);

    let minX = Infinity, maxX = -Infinity;
    processMap.forEach(p => {
        minX = Math.min(minX, p.x - PROCESS_NODE_WIDTH / 2);
        maxX = Math.max(maxX, p.x + PROCESS_NODE_WIDTH / 2);
    });

    const requiredWidth = maxX - minX + 40;
    ctx.canvas.width = Math.max(CANVAS_WIDTH, requiredWidth);
    
    const xOffset = ctx.canvas.width / 2 - (minX + (maxX - minX) / 2);
    shiftSubtree(rootProcess, xOffset, processMap);


    // Draw lines first
    processMap.forEach(process => {
        process.children.forEach(child => {
            ctx.beginPath();
            ctx.moveTo(process.x, process.y + PROCESS_NODE_HEIGHT / 2);
            ctx.lineTo(child.x, child.y - PROCESS_NODE_HEIGHT / 2);
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });
    });

    // Draw nodes on top
    processMap.forEach(process => {
        drawProcessNode(ctx, process);
    });
}

const getSubtreeWidth = (process: ForkProcess, processMap: Map<number, ForkProcess>): number => {
    if (process.children.length === 0) {
        return PROCESS_NODE_WIDTH;
    }
    let width = 0;
    process.children.forEach(child => {
        width += getSubtreeWidth(child, processMap) + 40; // Add margin
    });
    return Math.max(width - 40, PROCESS_NODE_WIDTH);
};


const drawProcessNode = (ctx: CanvasRenderingContext2D, process: ForkProcess) => {
    const x = process.x - PROCESS_NODE_WIDTH / 2;
    const y = process.y - PROCESS_NODE_HEIGHT / 2;

    ctx.fillStyle = '#10B981';
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, PROCESS_NODE_WIDTH, PROCESS_NODE_HEIGHT, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PID: ${process.pid}`, process.x, process.y - 10);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`PPID: ${process.ppid}`, process.x, process.y + 10);
};

