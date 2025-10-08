import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode } from './utils';

// Heap is represented as an array of Nodes for easier manipulation
// But we convert it to a tree for visualization
const arrayToTree = (nodes: Node[]): Node | null => {
    if (nodes.length === 0) return null;
    
    // Create tree nodes from heap array nodes
    const treeNodes = nodes.map(n => new Node(n.value, n.x, n.y, n.color, null, n.highlighted, n.secondaryHighlighted));

    treeNodes.forEach((node, i) => {
        const leftChildIndex = 2 * i + 1;
        const rightChildIndex = 2 * i + 2;
        if (leftChildIndex < treeNodes.length) {
            node.left = treeNodes[leftChildIndex];
            treeNodes[leftChildIndex].parent = node;
        }
        if (rightChildIndex < treeNodes.length) {
            node.right = treeNodes[rightChildIndex];
            treeNodes[rightChildIndex].parent = node;
        }
    });

    return treeNodes[0];
};

const treeToArray = (root: Node | null): Node[] => {
    if (!root) return [];
    const queue: (Node | null)[] = [root];
    const array: Node[] = [];
    let i = 0;
    while(i < queue.length) {
        const current = queue[i++];
        if (current) {
            array.push(current);
            queue.push(current.left);
            queue.push(current.right);
        }
    }
    return array;
}


const heapifyUp = (nodes: Node[], index: number, history: HistoryStep[]): void => {
    let currentIndex = index;
    let parentIndex = Math.floor((currentIndex - 1) / 2);

    while (currentIndex > 0 && nodes[currentIndex].value < nodes[parentIndex].value) {
        const tree = arrayToTree(nodes);
        addHistory(history, tree, `Heap property violated at index ${currentIndex} (${nodes[currentIndex].value}). Swapping with parent ${nodes[parentIndex].value}.`, nodes[currentIndex].value, undefined, nodes[parentIndex].value);

        // Swap
        [nodes[currentIndex], nodes[parentIndex]] = [nodes[parentIndex], nodes[currentIndex]];
        
        const swappedTree = arrayToTree(nodes);
        addHistory(history, swappedTree, `Swap complete. Continuing heapify-up.`, nodes[parentIndex].value, undefined, nodes[currentIndex].value);

        currentIndex = parentIndex;
        parentIndex = Math.floor((currentIndex - 1) / 2);
    }
};

const heapifyDown = (nodes: Node[], index: number, history: HistoryStep[]): void => {
    let currentIndex = index;
    const size = nodes.length;

    while (true) {
        const leftChildIndex = 2 * currentIndex + 1;
        const rightChildIndex = 2 * currentIndex + 2;
        let smallestIndex = currentIndex;

        if (leftChildIndex < size && nodes[leftChildIndex].value < nodes[smallestIndex].value) {
            smallestIndex = leftChildIndex;
        }
        if (rightChildIndex < size && nodes[rightChildIndex].value < nodes[smallestIndex].value) {
            smallestIndex = rightChildIndex;
        }

        if (smallestIndex !== currentIndex) {
             const tree = arrayToTree(nodes);
             addHistory(history, tree, `Heap property violated. Swapping ${nodes[currentIndex].value} with smaller child ${nodes[smallestIndex].value}.`, nodes[currentIndex].value, undefined, nodes[smallestIndex].value);
            
            // Swap
            [nodes[currentIndex], nodes[smallestIndex]] = [nodes[smallestIndex], nodes[currentIndex]];
            
            const swappedTree = arrayToTree(nodes);
            addHistory(history, swappedTree, `Swap complete. Continuing heapify-down.`, nodes[smallestIndex].value, undefined, nodes[currentIndex].value);

            currentIndex = smallestIndex;
        } else {
            break;
        }
    }
};


export const insertHeap = (initialRoot: Node | null, value: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    const heapNodes = treeToArray(initialRoot);
    
    addHistory(history, initialRoot, `Starting Heap insertion for value ${value}.`);
    
    // Add new value to the end
    const newNode = new Node(value);
    heapNodes.push(newNode);
    let tree = arrayToTree(heapNodes);
    addHistory(history, tree, `Added ${value} to the end of the heap.`, value);
    
    // Heapify up from the last element
    heapifyUp(heapNodes, heapNodes.length - 1, history);
    
    tree = arrayToTree(heapNodes);
    addHistory(history, tree, `Heap insertion of ${value} complete. Heap property restored.`);
    
    return history;
};

export const deleteHeap = (initialRoot: Node | null): HistoryStep[] => {
    const history: HistoryStep[] = [];
    if (!initialRoot) {
        addHistory(history, null, "Cannot extract min. Heap is empty.");
        return [{ tree: null, message: "Heap is empty." }];
    }
    
    const heapNodes = treeToArray(initialRoot);
    
    addHistory(history, initialRoot, `Starting Heap extract-min operation. Minimum is ${heapNodes[0].value}.`);
    
    const lastNode = heapNodes.pop()!;
    
    if (heapNodes.length > 0) {
        addHistory(history, arrayToTree(heapNodes), `Removing last element ${lastNode.value} and placing it at the root.`, heapNodes[0].value, undefined, lastNode.value);
        heapNodes[0] = lastNode;

        let tree = arrayToTree(heapNodes);
        addHistory(history, tree, `Root is now ${heapNodes[0].value}. Starting heapify-down to restore heap property.`, heapNodes[0].value);
        
        heapifyDown(heapNodes, 0, history);
    }
    
    let finalTree = arrayToTree(heapNodes);
    addHistory(history, finalTree, `Extract-min complete. Heap property restored.`);
    
    return history;
};
