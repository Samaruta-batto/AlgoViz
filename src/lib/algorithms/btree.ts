
import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode } from './utils';

// --- Helper Functions ---

const findNodeWithKey = (node: Node | null, k: number): Node | null => {
    if (!node) return null;

    let i = 0;
    while (i < node.keys.length && k > node.keys[i]) {
        i++;
    }

    if (i < node.keys.length && k === node.keys[i]) {
        return node;
    }

    if (node.isLeaf) {
        return null;
    }

    return findNodeWithKey(node.children[i], k);
};

// --- Insertion ---

// Splits the child y of node x. i is the index of y in x.children.
// y must be a full node.
const splitChild = (x: Node, i: number, y: Node, history: HistoryStep[], order: number) => {
    addHistory(history, x.getRoot(), `Node [${y.keys.join(',')}] is full. Splitting it.`, x.value, undefined, y.value);

    // 1. Create a new node z and move the largest t-1 keys from y to z.
    const z = new Node(0); // value is irrelevant
    z.isLeaf = y.isLeaf;
    z.parent = x;

    const medianIndex = order - 1;
    const medianKey = y.keys[medianIndex];
    
    // Move keys greater than median from y to z
    z.keys = y.keys.splice(medianIndex + 1);

    // Remove the median key from y (it will be moved to parent x)
    y.keys.pop();


    // 2. If y is an internal node, move the corresponding children from y to z.
    if (!y.isLeaf) {
        z.children = y.children.splice(order);
        z.children.forEach(child => child.parent = z);
    }
    
    y.value = y.keys[0];
    z.value = z.keys[0];

    // 3. Insert z as a new child of x.
    x.children.splice(i + 1, 0, z);

    // 4. Move the median key from y up to x.
    x.keys.splice(i, 0, medianKey);
    x.value = x.keys[0];

    addHistory(history, x.getRoot(), `Split complete. Median key ${medianKey} moved to parent. New nodes are [${y.keys.join(',')}] and [${z.keys.join(',')}].`, medianKey, undefined, x.value);
};


const insertNonFull = (node: Node, key: number, history: HistoryStep[], order: number) => {
    addHistory(history, node.getRoot(), `At node [${node.keys.join(',')}]. Finding position for key ${key}.`, node.value, key);

    if (node.isLeaf) {
        // Find position and insert key
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) {
            node.keys[i + 1] = node.keys[i];
            i--;
        }
        node.keys[i + 1] = key;
        node.value = node.keys[0];
        addHistory(history, node.getRoot(), `Inserted key ${key} into leaf node. Node is now [${node.keys.join(',')}].`, node.value, key);
    } else {
        // Find the child to descend into
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) {
            i--;
        }
        const childIndex = i + 1;
        let childToDescend = node.children[childIndex];
        
        addHistory(history, node.getRoot(), `Descending to child [${childToDescend.keys.join(',')}] to insert ${key}.`, node.value, key, childToDescend.value);


        // If the child is full, split it first
        if (childToDescend.keys.length === (2 * order) - 1) {
            splitChild(node, childIndex, childToDescend, history, order);

            // After split, decide which of the two new children to descend into
            if (key > node.keys[childIndex]) {
                 addHistory(history, node.getRoot(), `After split, key ${key} is greater than new parent key ${node.keys[childIndex]}. Descending to the new right sibling.`, node.children[childIndex+1].value);
                childToDescend = node.children[childIndex + 1];
            } else {
                 addHistory(history, node.getRoot(), `After split, key ${key} is less than new parent key ${node.keys[childIndex]}. Descending to the original child.`, node.children[childIndex].value);
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

    // Special case: If the root is full, the tree must grow in height.
    if (root.keys.length === (2 * order) - 1) {
        addHistory(history, root, `Root [${root.keys.join(',')}] is full. Creating new root and splitting old root.`, root.value);
        const newRoot = new Node(0); // Dummy value
        newRoot.isLeaf = false;
        newRoot.children.push(root);
        root.parent = newRoot;
        
        splitChild(newRoot, 0, root, history, order);
        root = newRoot;
        
        // After splitting, insert the key into the non-full new root structure
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
    const root = node.getRoot();
    if(root) addHistory(history, root, `Removed key ${key} from leaf node.`, node.keys[0] || node.parent?.keys[0]);
};

const removeFromNonLeaf = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
     const key = node.keys[keyIndex];
    const predChild = node.children[keyIndex];
    const succChild = node.children[keyIndex + 1];
    const root = node.getRoot();

    if(root) addHistory(history, root, `Removing ${key} from internal node.`, key, undefined, node.keys[0]);

    if (predChild.keys.length >= order) {
        const predKey = getPred(node, keyIndex, history);
        if(root) addHistory(history, root, `Predecessor child has enough keys. Replacing ${key} with predecessor ${predKey}.`, predKey, undefined, key);
        node.keys[keyIndex] = predKey;
        deleteBTreeRecursive(predChild, predKey, history, order);
    } else if (succChild.keys.length >= order) {
        const succKey = getSucc(node, keyIndex, history);
        if(root) addHistory(history, root, `Successor child has enough keys. Replacing ${key} with successor ${succKey}.`, succKey, undefined, key);
        node.keys[keyIndex] = succKey;
        deleteBTreeRecursive(succChild, succKey, history, order);
    } else {
        if(root) addHistory(history, root, `Both children have minimum keys. Merging them.`, predChild.keys[0], undefined, succChild.keys[0]);
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
    const root = node.getRoot();
    if(root) addHistory(history, root, `Merged nodes around key ${node.keys[keyIndex]}.`, child.keys[0]);
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
    const root = node.getRoot();
    if(root) addHistory(history, root, `Borrowed from previous sibling.`, child.keys[0]);
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
    const root = node.getRoot();
    if(root) addHistory(history, root, `Borrowed from next sibling.`, child.keys[0]);
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
    const root = node.getRoot();
    if(!root) return;
    
    addHistory(history, root, `Searching for key ${k} in node [${node.keys.join(',')}]`, node.keys[0], k);

    let keyIndex = node.keys.findIndex(key => key === k);
    
    if (keyIndex !== -1) { // Key is in this node
        if (node.isLeaf) {
            removeFromLeaf(node, keyIndex, history, order);
        } else {
            removeFromNonLeaf(node, keyIndex, history, order);
        }
    } else { // Key is not in this node
        if (node.isLeaf) {
            addHistory(history, root, `Key ${k} not found in the tree.`);
            return;
        }

        let i = 0;
        while (i < node.keys.length && k > node.keys[i]) {
            i++;
        }
        
        const child = node.children[i];

        if (child.keys.length < order) {
            addHistory(history, root, `Child [${child.keys.join(',')}] has too few keys. Filling it.`, child.keys[0]);
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
        return [{ tree: null, message: 'Tree is empty. Cannot delete.' }];
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

    

    