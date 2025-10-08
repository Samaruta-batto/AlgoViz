import { Node, HistoryStep } from './types';

export const CANVAS_WIDTH = 1200;
const NODE_RADIUS = 20;
const LEVEL_HEIGHT = 90;
const B_TREE_NODE_HEIGHT = 40;
const B_TREE_KEY_WIDTH = 40;

// --- BST/RBT Layout ---
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


// --- Main Drawing Function ---
export const drawTree = (ctx: CanvasRenderingContext2D, step: HistoryStep | null, treeType: 'BST' | 'RedBlackTree' | 'BTree', order: number) => {
    const root = step?.tree;
    let maxDepth = 0;
    
    const calculateDepth = (node: Node | null, depth: number) => {
        if (!node) return;
        maxDepth = Math.max(maxDepth, depth);
        if (treeType === 'BTree') {
            node.children.forEach(child => calculateDepth(child, depth + 1));
        } else {
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

    const findBounds = (node: Node) => {
        if (treeType === 'BTree') {
            const nodeStartX = node.x - node.width / 2;
            const nodeEndX = node.x + node.width / 2;
            minX = Math.min(minX, nodeStartX);
            maxX = Math.max(maxX, nodeEndX);
            node.children.forEach(findBounds);
        } else {
            minX = Math.min(minX, node.x - NODE_RADIUS);
            maxX = Math.max(maxX, node.x + NODE_RADIUS);
            if(node.left) findBounds(node.left);
            if(node.right) findBounds(node.right);
        }
    };
    

    // 1. Recalculate layout
    if (treeType === 'BTree') {
        layoutBTree(root, 0, order);
        positionBTree(root, NODE_RADIUS); // Add padding
    } else {
        layoutBinaryTree(root, CANVAS_WIDTH / 2, NODE_RADIUS, CANVAS_WIDTH / 4, 0);
    }

    findBounds(root);

    const requiredWidth = Math.max(CANVAS_WIDTH, maxX - minX + (NODE_RADIUS * 2));
    ctx.canvas.width = requiredWidth;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);


    // 2. Recursive draw
    const drawRecursive = (node: Node) => {
        if (treeType === 'BTree') {
            // Draw connections first
            if (!node.isLeaf) {
                node.children.forEach((child, index) => {
                    ctx.beginPath();
                    const parentKeyWidth = node.keys.length * B_TREE_KEY_WIDTH;
                    const parentStartX = node.x - parentKeyWidth / 2;
                    const lineStartX = parentStartX + index * (B_TREE_KEY_WIDTH);
                    
                    ctx.moveTo(lineStartX, node.y + B_TREE_NODE_HEIGHT / 2);
                    ctx.lineTo(child.x, child.y - B_TREE_NODE_HEIGHT / 2);
                    ctx.strokeStyle = '#6b7280';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });
            }
            // Then draw nodes
            drawBTreeNode(ctx, node, step);
            // Then recurse
            if (!node.isLeaf) {
                node.children.forEach(drawRecursive);
            }
        } else {
            // Draw connections for BST/RBT
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
             // Then draw nodes
            drawBinaryNode(ctx, node, step);
            // Then recurse
            if (node.left) drawRecursive(node.left);
            if (node.right) drawRecursive(node.right);
        }
    };
    
    drawRecursive(root);
};


const drawBTreeNode = (ctx: CanvasRenderingContext2D, node: Node, step: HistoryStep | null) => {
    const keyCount = node.keys.length;
    const boxWidth = keyCount * B_TREE_KEY_WIDTH;
    const startX = node.x - boxWidth / 2;
    
    const isPrimaryHighlight = step?.highlightNodeValue === node.value || (node.keys.includes(step?.highlightNodeValue ?? -1) && node.children.length > 0);
    const isSecondaryHighlight = step?.secondaryHighlightNodeValue === node.value || (node.keys.includes(step?.secondaryHighlightNodeValue ?? -1) && node.children.length > 0);
    
    let fillColor = '#10B981'; // Default green
    let strokeColor = '#047857';

    if(isPrimaryHighlight) {
        fillColor = '#F59E0B'; // Yellow
        strokeColor = '#D97706';
    } else if(isSecondaryHighlight) {
        fillColor = '#38BDF8'; // Sky blue
        strokeColor = '#0284C7';
    }


    // Draw the outer rectangular box
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(startX, node.y - B_TREE_NODE_HEIGHT / 2, boxWidth, B_TREE_NODE_HEIGHT, 8);
    ctx.fill();
    ctx.stroke();
    
    // Draw keys and internal dividers
    node.keys.forEach((key, index) => {
        const keyStartX = startX + index * B_TREE_KEY_WIDTH;
        
        // Highlight specific key
        if(step?.highlightKey === key) {
            ctx.fillStyle = 'rgba(251, 146, 60, 0.5)'; // Orange highlight
            ctx.fillRect(keyStartX, node.y - B_TREE_NODE_HEIGHT / 2, B_TREE_KEY_WIDTH, B_TREE_NODE_HEIGHT);
        }

        // Draw internal divider line
        if (index > 0) {
            ctx.beginPath();
            ctx.moveTo(keyStartX, node.y - B_TREE_NODE_HEIGHT / 2);
            ctx.lineTo(keyStartX, node.y + B_TREE_NODE_HEIGHT / 2);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Draw the value text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key.toString(), keyStartX + B_TREE_KEY_WIDTH / 2, node.y);
    });
}

const drawBinaryNode = (ctx: CanvasRenderingContext2D, node: Node, step: HistoryStep | null) => {
    const isPrimaryHighlight = node.value === step?.highlightNodeValue;
    const isSecondaryHighlight = node.value === step?.secondaryHighlightNodeValue;

    let fillColor = node.color === 'red' ? '#EF4444' : '#10B981';
    let strokeColor = node.color === 'red' ? '#B91C1C' : '#047857';

    if (isPrimaryHighlight) {
        fillColor = '#F59E0B';
        strokeColor = '#D97706';
    } else if (isSecondaryHighlight) {
        fillColor = '#38BDF8';
        strokeColor = '#0284C7';
    }
    
    // Draw the node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw the value text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.value.toString(), node.x, node.y);
};

    