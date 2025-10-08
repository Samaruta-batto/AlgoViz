import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode } from './utils';

let history: HistoryStep[];

const link = (y: Node, z: Node): void => {
    const root = y.getRoot();
    addHistory(history, root, `Linking trees with roots ${y.value} (degree ${y.degree}) and ${z.value} (degree ${z.degree}).`);
    y.parent = z;
    y.sibling = z.child;
    z.child = y;
    z.degree++;
    addHistory(history, root, `Link complete. ${z.value} is now parent of ${y.value}. Degree of ${z.value} is now ${z.degree}.`, z.value, undefined, y.value);
};

const mergeHeaps = (h1: Node | null, h2: Node | null): Node | null => {
    if (!h1) return h2;
    if (!h2) return h1;

    let head: Node | null = null;
    let tail: Node | null = null;
    let n1: Node | null = h1;
    let n2: Node | null = h2;

    if (n1.degree <= n2.degree) {
        head = n1;
        n1 = n1.sibling;
    } else {
        head = n2;
        n2 = n2.sibling;
    }
    tail = head;

    while (n1 && n2) {
        if (n1.degree <= n2.degree) {
            tail.sibling = n1;
            tail = n1;
            n1 = n1.sibling;
        } else {
            tail.sibling = n2;
            tail = n2;
            n2 = n2.sibling;
        }
    }

    if (n1) {
        tail.sibling = n1;
    } else if (n2) {
        tail.sibling = n2;
    }
    
    // Create a dummy root to represent the heap for visualization
    const dummyRoot = new Node(0);
    dummyRoot.children = [];
    let current = head;
    while (current) {
        current.parent = dummyRoot;
        dummyRoot.children.push(current);
        current = current.sibling;
    }
    dummyRoot.isBinomialHeap = true;
    addHistory(history, dummyRoot, "Merged two heaps into a single list of roots, ordered by degree.");
    return head;
};

const unionHeaps = (h1: Node | null, h2: Node | null): Node | null => {
    let head = mergeHeaps(h1, h2);
    if (!head) return null;

    let prev: Node | null = null;
    let x: Node | null = head;
    let next: Node | null = x.sibling;

    const getRootForHistory = () => {
        const dummyRoot = new Node(0);
        dummyRoot.children = [];
        let current = head;
        while(current) {
            dummyRoot.children.push(current);
            current = current.sibling;
        }
        dummyRoot.isBinomialHeap = true;
        return dummyRoot;
    }

    while (next) {
        if (x.degree !== next.degree || (next.sibling && next.sibling.degree === x.degree)) {
            addHistory(history, getRootForHistory(), `Degrees of ${x.value} (${x.degree}) and ${next.value} (${next.degree}) are different or there's a third tree of same degree. Moving to next pair.`);
            prev = x;
            x = next;
        } else {
            if (x.value <= next.value) {
                addHistory(history, getRootForHistory(), `Degrees are equal. ${x.value} <= ${next.value}. Linking ${next.value} under ${x.value}.`, x.value, undefined, next.value);
                x.sibling = next.sibling;
                link(next, x);
            } else {
                addHistory(history, getRootForHistory(), `Degrees are equal. ${next.value} < ${x.value}. Linking ${x.value} under ${next.value}.`, next.value, undefined, x.value);
                if (prev) {
                    prev.sibling = next;
                } else {
                    head = next;
                }
                link(x, next);
                x = next;
            }
        }
        next = x.sibling;
    }
    return head;
};

export const insertBinomialHeap = (initialRoot: Node | null, value: number): HistoryStep[] => {
    history = [];
    let heapRoots: Node | null = null;
    
    // Reconstruct root list from dummy root
    if (initialRoot && initialRoot.isBinomialHeap) {
        if (initialRoot.children.length > 0) {
            heapRoots = initialRoot.children[0];
            for (let i = 0; i < initialRoot.children.length - 1; i++) {
                initialRoot.children[i].sibling = initialRoot.children[i+1];
            }
            initialRoot.children[initialRoot.children.length - 1].sibling = null;
        }
    } else if (initialRoot) { // Handle case of single node from previous structures
        heapRoots = initialRoot;
        heapRoots.sibling = null;
    }

    const newNode = new Node(value, 0, 0, 'black', null);
    newNode.degree = 0;
    newNode.child = null;
    newNode.sibling = null;
    
    const newHeapHead = new Node(0);
    newHeapHead.children.push(newNode);
    newHeapHead.isBinomialHeap = true;
    addHistory(history, newHeapHead, `Creating a new heap for value ${value}.`);

    const finalRoots = unionHeaps(heapRoots, newNode);

    const dummyRoot = new Node(0);
    dummyRoot.isBinomialHeap = true;
    dummyRoot.children = [];
    let current = finalRoots;
    while (current) {
        dummyRoot.children.push(current);
        current = current.sibling;
    }
    
    addHistory(history, dummyRoot, `Insertion of ${value} complete. Heap is stable.`);
    return history;
};

export const deleteBinomialHeap = (initialRoot: Node | null): HistoryStep[] => {
    history = [];
    if (!initialRoot || initialRoot.children.length === 0) {
        addHistory(history, null, "Cannot extract min. Heap is empty.");
        return [{ tree: null, message: "Heap is empty." }];
    }
    
    let heapRoots = initialRoot.children;
    addHistory(history, initialRoot, "Starting extract-min operation.");

    // Find the root with the minimum key
    let minNode: Node | null = heapRoots[0];
    let minPrev: Node | null = null;
    let current = heapRoots[0];
    let prev: Node | null = null;

    for (let i = 1; i < heapRoots.length; i++) {
        const node = heapRoots[i];
        if (node.value < minNode!.value) {
            minNode = node;
            minPrev = prev;
        }
        prev = node;
    }
     addHistory(history, initialRoot, `Found minimum value ${minNode!.value} in the root list.`, minNode!.value);
    
    // Remove minNode from the root list
    if (minPrev) {
       // Handled by rebuilding the list later
    }
    heapRoots = heapRoots.filter(n => n !== minNode);


    let newRootList: Node | null = null;
    if (heapRoots.length > 0) {
        for(let i=0; i<heapRoots.length - 1; i++) {
            heapRoots[i].sibling = heapRoots[i+1];
        }
        heapRoots[heapRoots.length - 1].sibling = null;
        newRootList = heapRoots[0];
    }
    
    let childrenHeap: Node | null = minNode!.child;
    if (childrenHeap) {
        // Reverse the children list
        let prev: Node | null = null;
        let curr: Node | null = childrenHeap;
        while(curr) {
            curr.parent = null;
            let nextTemp = curr.sibling;
            curr.sibling = prev;
            prev = curr;
            curr = nextTemp;
        }
        childrenHeap = prev;
    }
    
    let finalRoots = unionHeaps(newRootList, childrenHeap);

    const dummyRoot = new Node(0);
    dummyRoot.isBinomialHeap = true;
    dummyRoot.children = [];
    let finalCurrent = finalRoots;
    while (finalCurrent) {
        dummyRoot.children.push(finalCurrent);
        finalCurrent = finalCurrent.sibling;
    }

    addHistory(history, dummyRoot, `Extracted min value ${minNode!.value}. Heap is stable.`);

    return history;
}