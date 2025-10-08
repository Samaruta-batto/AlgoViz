
import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode } from './utils';

// --- Helper Functions ---

const findNodeWithKey = (node: Node | null, k: number): Node | null => {
    if (!node) return null;
    
    let i = 0;
    while(i < node.keys.length && k > node.keys[i]) {
        i++;
    }

    if (i < node.keys.length && k === node.keys[i]) {
        return node;
    }
    
    if (node.isLeaf) {
        return null;
    }

    return findNodeWithKey(node.children[i], k);
}

// --- Insertion ---

const splitChild = (parent: Node, childIndex: number, history: HistoryStep[], order: number) => {
    const childToSplit = parent.children[childIndex];
    addHistory(history, deepCloneNode(parent.getRoot()), `Node [${childToSplit.keys.join(',')}] is full. Splitting it.`, undefined, undefined, parent.keys.length > 0 ? parent.keys[0] : undefined);

    const newSibling = new Node(0); // value is irrelevant, will be set by keys
    newSibling.isLeaf = childToSplit.isLeaf;
    newSibling.parent = parent;

    // The median key moves up to the parent
    const medianKey = childToSplit.keys[order - 1];

    // Keys greater than the median go to the new sibling
    newSibling.keys = childToSplit.keys.splice(order);
    
    // The median key itself is removed from the original child's key list
    childToSplit.keys.pop();

    // If the split node was not a leaf, redistribute its children
    if (!childToSplit.isLeaf) {
        newSibling.children = childToSplit.children.splice(order);
        newSibling.children.forEach(c => { c.parent = newSibling; });
    }
    
    // Insert the new sibling into the parent's children array
    parent.children.splice(childIndex + 1, 0, newSibling);
    
    // Insert the median key into the parent's keys array
    parent.keys.splice(childIndex, 0, medianKey);
    
    // Update representative values for drawing
    parent.value = parent.keys[0];
    childToSplit.value = childToSplit.keys[0];
    newSibling.value = newSibling.keys[0];
    
    addHistory(history, deepCloneNode(parent.getRoot()), `Split complete. Median key ${medianKey} promoted to parent [${parent.keys.join(',')}].`, medianKey, undefined, parent.keys.length > 0 ? parent.keys[0] : undefined);
};

const insertNonFull = (node: Node, key: number, history: HistoryStep[], order: number) => {
    addHistory(history, deepCloneNode(node.getRoot()), `At node [${node.keys.join(',')}]. Finding spot for key ${key}.`, undefined, key, node.keys.length > 0 ? node.keys[0] : undefined);
    
    if (node.isLeaf) {
        addHistory(history, deepCloneNode(node.getRoot()), `Node is a leaf. Inserting key ${key}.`, undefined, key, node.keys.length > 0 ? node.keys[0] : undefined);
        let i = node.keys.length - 1;
        // Find position for the new key and shift others
        while (i >= 0 && key < node.keys[i]) {
            node.keys[i + 1] = node.keys[i];
            i--;
        }
        node.keys[i + 1] = key;
        node.value = node.keys[0]; // Update representative value
        addHistory(history, deepCloneNode(node.getRoot()), `Key ${key} inserted. Leaf is now [${node.keys.join(',')}].`, undefined, key, node.keys.length > 0 ? node.keys[0] : undefined);
    } else {
        // Find the child to descend into
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) {
            i--;
        }
        const childIndex = i + 1;
        let childToDescend = node.children[childIndex];

        addHistory(history, deepCloneNode(node.getRoot()), `Key ${key} fits in child [${childToDescend.keys.join(',')}]. Descending...`, undefined, key, childToDescend.keys.length > 0 ? childToDescend.keys[0] : undefined);

        // If the child is full, we must split it first
        if (childToDescend.keys.length === 2 * order - 1) {
            splitChild(node, childIndex, history, order);
            // After splitting, the key might need to go to the new sibling
            if (key > node.keys[childIndex]) {
                childToDescend = node.children[childIndex + 1];
                 addHistory(history, deepCloneNode(node.getRoot()), `After split, descending into new sibling [${childToDescend.keys.join(',')}]`, undefined, key, childToDescend.keys.length > 0 ? childToDescend.keys[0] : undefined);
            }
        }
        insertNonFull(childToDescend, key, history, order);
    }
};

export const insertBTree = (initialRoot: Node | null, key: number, order: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting B-Tree insertion of key ${key} with order T=${order}.`);

    if (!root) {
        root = new Node(key);
        root.isLeaf = true;
        addHistory(history, root, `Tree is empty. Created new root with key ${key}.`, key, key);
        addHistory(history, root, `B-Tree insertion of ${key} complete.`);
        return history;
    }
    
    if (findNodeWithKey(root, key)) {
        addHistory(history, root, `Key ${key} already exists. No changes made.`);
        return [{ tree: root, message: `Key ${key} already exists in the tree.` }];
    }

    // If the root is full, we must split it. The tree will grow in height.
    if (root.keys.length === 2 * order - 1) {
        addHistory(history, root, `Root [${root.keys.join(',')}] is full. Splitting root before insertion.`, undefined, key, root.keys.length > 0 ? root.keys[0] : undefined);
        const newRoot = new Node(0); // Dummy value
        newRoot.isLeaf = false;
        newRoot.children.push(root);
        root.parent = newRoot;
        splitChild(newRoot, 0, history, order);
        root = newRoot; // The new root is the parent.
        insertNonFull(root, key, history, order);
    } else {
        insertNonFull(root, key, history, order);
    }
    
    addHistory(history, root, `B-Tree insertion of ${key} complete.`);
    return history;
};

// --- Deletion ---
const removeFromLeaf = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
    const key = node.keys[keyIndex];
    node.keys.splice(keyIndex, 1);
    if(node.getRoot()) addHistory(history, node.getRoot(), `Removed key ${key} from leaf node.`, node.keys[0] || node.parent?.keys[0]);
};

const removeFromNonLeaf = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
     const key = node.keys[keyIndex];
    const predChild = node.children[keyIndex];
    const succChild = node.children[keyIndex + 1];

    if(node.getRoot()) addHistory(history, node.getRoot(), `Removing ${key} from internal node.`, key, undefined, node.keys[0]);

    if (predChild.keys.length >= order) {
        const predKey = getPred(node, keyIndex, history);
        if(node.getRoot()) addHistory(history, node.getRoot(), `Predecessor child has enough keys. Replacing ${key} with predecessor ${predKey}.`, predKey, undefined, key);
        node.keys[keyIndex] = predKey;
        deleteBTreeRecursive(predChild, predKey, history, order);
    } else if (succChild.keys.length >= order) {
        const succKey = getSucc(node, keyIndex, history);
        if(node.getRoot()) addHistory(history, node.getRoot(), `Successor child has enough keys. Replacing ${key} with successor ${succKey}.`, succKey, undefined, key);
        node.keys[keyIndex] = succKey;
        deleteBTreeRecursive(succChild, succKey, history, order);
    } else {
        if(node.getRoot()) addHistory(history, node.getRoot(), `Both children have minimum keys. Merging them.`, predChild.keys[0], undefined, succChild.keys[0]);
        merge(node, keyIndex, history, order);
        deleteBTreeRecursive(predChild, key, history, order);
    }
};

const getPred = (node: Node, keyIndex: number, history: HistoryStep[]): number => {
    let curr = node.children[keyIndex];
    while (!curr.isLeaf) {
        curr = curr.children[curr.children.length - 1];
    }
    return curr.keys[curr.keys.length - 1];
};

const getSucc = (node: Node, keyIndex: number, history: HistoryStep[]): number => {
    let curr = node.children[keyIndex + 1];
    while (!curr.isLeaf) {
        curr = curr.children[0];
    }
    return curr.keys[0];
};

const merge = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
    const child = node.children[keyIndex];
    const sibling = node.children[keyIndex + 1];
    child.keys.push(node.keys[keyIndex]);

    for (let i = 0; i < sibling.keys.length; ++i) {
        child.keys.push(sibling.keys[i]);
    }

    if (!child.isLeaf) {
        for (let i = 0; i < sibling.children.length; ++i) {
            child.children.push(sibling.children[i]);
        }
    }

    node.keys.splice(keyIndex, 1);
    node.children.splice(keyIndex + 1, 1);
    if(node.getRoot()) addHistory(history, node.getRoot(), `Merged nodes around key ${node.keys[keyIndex]}.`, child.keys[0]);
};

const borrowFromPrev = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
    const child = node.children[keyIndex];
    const sibling = node.children[keyIndex - 1];

    child.keys.unshift(node.keys[keyIndex - 1]);
    node.keys[keyIndex - 1] = sibling.keys[sibling.keys.length - 1];

    if (!child.isLeaf) {
        child.children.unshift(sibling.children[sibling.children.length - 1]);
    }

    sibling.keys.pop();
    if (!sibling.isLeaf) {
        sibling.children.pop();
    }
     if(node.getRoot()) addHistory(history, node.getRoot(), `Borrowed from previous sibling.`, child.keys[0]);
};

const borrowFromNext = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
    const child = node.children[keyIndex];
    const sibling = node.children[keyIndex + 1];

    child.keys.push(node.keys[keyIndex]);
    node.keys[keyIndex] = sibling.keys[0];

    if (!child.isLeaf) {
        child.children.push(sibling.children[0]);
    }

    sibling.keys.shift();
    if (!sibling.isLeaf) {
        sibling.children.shift();
    }
    if(node.getRoot()) addHistory(history, node.getRoot(), `Borrowed from next sibling.`, child.keys[0]);
};


const fill = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
    if (keyIndex !== 0 && node.children[keyIndex - 1].keys.length >= order) {
        borrowFromPrev(node, keyIndex, history, order);
    } else if (keyIndex !== node.keys.length && node.children[keyIndex + 1].keys.length >= order) {
        borrowFromNext(node, keyIndex, history, order);
    } else {
        if (keyIndex !== node.keys.length) {
            merge(node, keyIndex, history, order);
        } else {
            merge(node, keyIndex - 1, history, order);
        }
    }
}


const deleteBTreeRecursive = (node: Node, k: number, history: HistoryStep[], order: number): void => {
    if(!node) return;
    if(node.getRoot()) addHistory(history, node.getRoot(), `Searching for key ${k} in node [${node.keys.join(',')}]`, node.keys[0], k);

    let keyIndex = node.keys.findIndex(key => key === k);
    
    if (keyIndex !== -1) { // Key is in this node
        if (node.isLeaf) {
            removeFromLeaf(node, keyIndex, history, order);
        } else {
            removeFromNonLeaf(node, keyIndex, history, order);
        }
    } else { // Key is not in this node
        if (node.isLeaf) {
            if(node.getRoot()) addHistory(history, node.getRoot(), `Key ${k} not found in the tree.`);
            return;
        }

        let i = 0;
        while (i < node.keys.length && k > node.keys[i]) {
            i++;
        }
        
        const child = node.children[i];

        if (child.keys.length < order) {
             if(node.getRoot()) addHistory(history, node.getRoot(), `Child [${child.keys.join(',')}] has too few keys. Filling it.`, child.keys[0]);
            fill(node, i, history, order);
        }
        
         let newI = 0;
         while (newI < node.keys.length && k > node.keys[newI]) {
            newI++;
        }

        deleteBTreeRecursive(node.children[newI], k, history, order);
    }
};


export const deleteBTree = (initialRoot: Node | null, k: number, order: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting B-Tree deletion of key ${k} with order T=${order}.`);

    if (!root) {
        addHistory(history, null, `Tree is empty. Cannot delete.`);
        return history;
    }
    
    if (!findNodeWithKey(root, k)) {
        addHistory(history, root, `Key ${k} not found in the tree.`);
         return [{ tree: root, message: `Key ${k} not found in the tree.` }];
    }

    deleteBTreeRecursive(root, k, history, order);

    if (root.keys.length === 0) {
        addHistory(history, root, `Root became empty. Updating root.`);
        if (root.isLeaf) {
            root = null;
        } else {
            root = root.children[0];
            if(root) root.parent = null;
        }
    }

    addHistory(history, root, `B-Tree deletion of ${k} complete.`);
    return history;
};

    