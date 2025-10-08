import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode } from './utils';

// --- Insertion ---

const splitChild = (x: Node, i: number, order: number) => {
    const root = x.getRoot();
    const y = x.children[i];
    addHistory(history, root, `Node [${y.keys.join(',')}] is full. Splitting it.`, undefined, undefined, y.value);

    const z = new Node(0); // value is irrelevant, will be updated
    z.isLeaf = y.isLeaf;
    z.parent = x;
    
    const t = order;
    const medianKey = y.keys[t - 1];

    // Move last (t-1) keys from y to z
    z.keys = y.keys.splice(t, t - 1);
    // Remove median key from y
    y.keys.splice(t - 1, 1);

    if (!y.isLeaf) {
        // Move last t children from y to z
        z.children = y.children.splice(t, t);
        z.children.forEach(child => child.parent = z);
    }
    
    // Insert z as a new child of x
    x.children.splice(i + 1, 0, z);

    // Move median key up to x
    x.keys.splice(i, 0, medianKey);
    
    // Update .value for highlighting
    y.value = y.keys[0];
    z.value = z.keys[0];
    x.value = x.keys[0];

    addHistory(history, root, `Split complete. Median key ${medianKey} moved to parent. New nodes are [${y.keys.join(',')}] and [${z.keys.join(',')}].`, medianKey, undefined, x.value);
};


const insertNonFull = (node: Node, key: number, order: number) => {
    const root = node.getRoot();
    addHistory(history, root, `At node [${node.keys.join(',')}]. Finding position for key ${key}.`, undefined, key);

    if (node.isLeaf) {
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) {
            i--;
        }
        node.keys.splice(i + 1, 0, key);
        node.value = node.keys[0];
        addHistory(history, root, `Inserted key ${key} into leaf node. Node is now [${node.keys.join(',')}].`, undefined, key);
    } else {
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) {
            i--;
        }
        const childIndex = i + 1;
        let childToDescend = node.children[childIndex];
        
        addHistory(history, root, `Descending to child [${childToDescend.keys.join(',')}] to insert ${key}.`, undefined, key, childToDescend.value);

        if (childToDescend.keys.length === (2 * order) - 1) {
            splitChild(node, childIndex, order);
            // After split, the key might go to the new child
            if (key > node.keys[childIndex]) {
                childToDescend = node.children[childIndex + 1];
                 addHistory(history, root, `After split, key ${key} is greater than new parent key ${node.keys[childIndex]}. Descending to the new right sibling.`, undefined, undefined, childToDescend.value);
            } else {
                 addHistory(history, root, `After split, key ${key} is less than new parent key ${node.keys[childIndex]}. Descending to the original child.`, undefined, undefined, childToDescend.value);
            }
        }
        insertNonFull(childToDescend, key, order);
    }
};

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

let history: HistoryStep[];

export const insertBTree = (initialRoot: Node | null, key: number, order: number): HistoryStep[] => {
    history = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting B-Tree insertion of key ${key} with order T=${order}.`);

    if (findNodeWithKey(root, key)) {
        addHistory(history, root, `Key ${key} already exists. No changes made.`);
        return [{ tree: root, message: `Key ${key} already exists in the tree.` }];
    }

    if (!root) {
        root = new Node(key);
        root.isLeaf = true;
        addHistory(history, root, `Tree is empty. Created new root with key ${key}.`, key, key);
    } else {
        if (root.keys.length === (2 * order) - 1) {
            addHistory(history, root, `Root [${root.keys.join(',')}] is full. Creating new root and splitting old root.`, root.value);
            const newRoot = new Node(0); // Dummy value
            newRoot.isLeaf = false;
            newRoot.children.push(root);
            root.parent = newRoot;
            
            splitChild(newRoot, 0, order);
            root = newRoot;
            insertNonFull(root, key, order);
        } else {
            insertNonFull(root, key, order);
        }
    }
    
    addHistory(history, root, `B-Tree insertion of ${key} complete.`);
    return history;
};

// --- Deletion ---

function findKey(node: Node, k: number): [boolean, number] {
    let idx = 0;
    while (idx < node.keys.length && node.keys[idx] < k) {
        ++idx;
    }
    return [idx < node.keys.length && node.keys[idx] == k, idx];
}

function removeFromLeaf(node: Node, idx: number) {
    const root = node.getRoot();
    const key = node.keys[idx];
    node.keys.splice(idx, 1);
    addHistory(history, root, `Case 1: Key ${key} is in a leaf with enough keys. Removed it directly.`, undefined, key);
}

function getPred(node: Node, idx: number): number {
    let curr = node.children[idx];
    while (!curr.isLeaf) {
        curr = curr.children[curr.children.length - 1];
    }
    return curr.keys[curr.keys.length - 1];
}

function getSucc(node: Node, idx: number): number {
    let curr = node.children[idx + 1];
    while (!curr.isLeaf) {
        curr = curr.children[0];
    }
    return curr.keys[0];
}

function borrowFromPrev(node: Node, idx: number, order: number) {
    const root = node.getRoot();
    const child = node.children[idx];
    const sibling = node.children[idx - 1];
    const parentKey = node.keys[idx - 1];

    addHistory(history, root, `Case 3a: Child has t-1 keys. Borrowing from left sibling through parent.`, parentKey);

    child.keys.unshift(parentKey);
    node.keys[idx - 1] = sibling.keys.pop()!;

    if (!sibling.isLeaf) {
        child.children.unshift(sibling.children.pop()!);
        child.children[0].parent = child;
    }
}

function borrowFromNext(node: Node, idx: number, order: number) {
    const root = node.getRoot();
    const child = node.children[idx];
    const sibling = node.children[idx + 1];
    const parentKey = node.keys[idx];

    addHistory(history, root, `Case 3a: Child has t-1 keys. Borrowing from right sibling through parent.`, parentKey);

    child.keys.push(parentKey);
    node.keys[idx] = sibling.keys.shift()!;

    if (!sibling.isLeaf) {
        child.children.push(sibling.children.shift()!);
        child.children[child.children.length-1].parent = child;
    }
}

function merge(node: Node, idx: number, order: number) {
    const root = node.getRoot();
    const child = node.children[idx];
    const sibling = node.children[idx + 1];
    const parentKey = node.keys[idx];
    
    addHistory(history, root, `Case 3b/2c: Merging children around parent key ${parentKey}.`, parentKey);

    child.keys.push(parentKey);
    child.keys.push(...sibling.keys);

    if (!child.isLeaf) {
        child.children.push(...sibling.children);
        child.children.forEach(c => c.parent = child);
    }
    
    node.keys.splice(idx, 1);
    node.children.splice(idx + 1, 1);
    
    addHistory(history, root, `Merge complete. New node: [${child.keys.join(',')}]`, undefined, undefined, child.value);
}


function fill(node: Node, idx: number, order: number) {
    const t = order;
    if (idx != 0 && node.children[idx - 1].keys.length >= t) {
        borrowFromPrev(node, idx, order);
    } else if (idx != node.keys.length && node.children[idx + 1].keys.length >= t) {
        borrowFromNext(node, idx, order);
    } else {
        if (idx != node.keys.length) {
            merge(node, idx, order);
        } else {
            merge(node, idx - 1, order);
        }
    }
}


function removeFromNonLeaf(node: Node, idx: number, order: number) {
    const root = node.getRoot();
    const k = node.keys[idx];
    const t = order;

    const predChild = node.children[idx];
    const succChild = node.children[idx + 1];

    if (predChild.keys.length >= t) {
        const pred = getPred(node, idx);
        addHistory(history, root, `Case 2a: Predecessor child has >= t keys. Replacing ${k} with predecessor ${pred}.`, k, pred);
        node.keys[idx] = pred;
        deleteBTreeRecursive(predChild, pred, order);
    } else if (succChild.keys.length >= t) {
        const succ = getSucc(node, idx);
        addHistory(history, root, `Case 2b: Successor child has >= t keys. Replacing ${k} with successor ${succ}.`, k, succ);
        node.keys[idx] = succ;
        deleteBTreeRecursive(succChild, succ, order);
    } else {
        addHistory(history, root, `Case 2c: Both children have t-1 keys. Merging them with ${k}.`, k);
        merge(node, idx, order);
        deleteBTreeRecursive(predChild, k, order);
    }
}


function deleteBTreeRecursive(node: Node, k: number, order: number) {
    const root = node.getRoot();
    const t = order;
    const [keyFound, idx] = findKey(node, k);
    
    addHistory(history, root, `Searching for key ${k} in node [${node.keys.join(',')}]`, undefined, k);


    if (node.isLeaf) {
        if (keyFound) {
            removeFromLeaf(node, idx);
        } else {
             addHistory(history, root, `Key ${k} not found in the tree.`);
        }
        return;
    }

    if (keyFound) { // Key k is in internal node
        removeFromNonLeaf(node, idx, order);
    } else { // Key k is not in this internal node, go to child
        const childIdx = idx;
        const childNode = node.children[childIdx];
        
        if (childNode.keys.length < t) {
            addHistory(history, root, `Child [${childNode.keys.join(',')}] has less than t keys. Must perform rotation or merge.`, undefined, undefined, childNode.value);
            fill(node, childIdx, order);
        }
        
        // After fill, the child to descend into might have changed if a merge occurred.
        const [,,newChildIdx] = findKey(node, k);

        deleteBTreeRecursive(node.children[newChildIdx], k, order);
    }
}


export const deleteBTree = (initialRoot: Node | null, k: number, order: number): HistoryStep[] => {
    history = [];
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

    deleteBTreeRecursive(root, k, order);
    
    const finalRoot = root.getRoot();

    // If the root node has no keys, make its first child the new root.
    if (finalRoot.keys.length === 0) {
        addHistory(history, finalRoot, `Root became empty. Updating root to its first child.`);
        if (finalRoot.isLeaf) { // Tree is now empty
            root = null;
        } else {
            root = finalRoot.children[0];
            if(root) root.parent = null;
        }
    }

    addHistory(history, root, `B-Tree deletion of ${k} complete.`);
    return history;
};
