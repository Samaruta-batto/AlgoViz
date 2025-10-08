import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode } from './utils';

// --- Shared State ---
let history: HistoryStep[];

// --- B-Tree Search ---
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


// --- B-Tree Insertion ---

const splitChild = (parent: Node, childIndex: number, order: number) => {
    const root = parent.getRoot();
    const fullChild = parent.children[childIndex];
    addHistory(history, root, `Node [${fullChild.keys.join(',')}] is full. Splitting it.`, fullChild.value);

    const newSibling = new Node(0); // Dummy value
    newSibling.isLeaf = fullChild.isLeaf;
    newSibling.parent = parent;

    const t = order;
    const medianKey = fullChild.keys[t - 1];

    // Move last (t-1) keys from fullChild to newSibling
    newSibling.keys = fullChild.keys.splice(t);

    if (!fullChild.isLeaf) {
        // Move last t children from fullChild to newSibling
        newSibling.children = fullChild.children.splice(t);
        newSibling.children.forEach(child => child.parent = newSibling);
    }

    // Insert newSibling as a child of the parent
    parent.children.splice(childIndex + 1, 0, newSibling);

    // Move median key up to the parent
    parent.keys.splice(childIndex, 0, medianKey);
    
    addHistory(history, root, `Split complete. Median key ${medianKey} moved to parent.`, medianKey, undefined, parent.value);
};

const insertNonFull = (node: Node, key: number, order: number) => {
    const root = node.getRoot();
    
    if (node.isLeaf) {
        addHistory(history, root, `At leaf node [${node.keys.join(',')}]. Finding position for key ${key}.`, node.value);
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) {
            i--;
        }
        node.keys.splice(i + 1, 0, key);
        addHistory(history, root, `Inserted key ${key}. Node is now [${node.keys.join(',')}].`, key);
    } else {
        addHistory(history, root, `At internal node [${node.keys.join(',')}]. Finding child for key ${key}.`, node.value);
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) {
            i--;
        }
        const childIndex = i + 1;
        let childToDescend = node.children[childIndex];
        
        addHistory(history, root, `Descending to child [${childToDescend.keys.join(',')}] to insert ${key}.`, childToDescend.value);

        if (childToDescend.keys.length === (2 * order) - 1) {
            splitChild(node, childIndex, order);
            // After split, the key might go to the new child
            if (key > node.keys[childIndex]) {
                childToDescend = node.children[childIndex + 1];
                 addHistory(history, root, `After split, key ${key} is greater than new parent key ${node.keys[childIndex]}. Descending to the new right sibling.`, childToDescend.value);
            } else {
                 addHistory(history, root, `After split, key ${key} is less than new parent key ${node.keys[childIndex]}. Descending to the original child.`, childToDescend.value);
            }
        }
        insertNonFull(childToDescend, key, order);
    }
};

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
        addHistory(history, root, `Tree is empty. Created new root with key ${key}.`, key);
    } else {
        if (root.keys.length === (2 * order) - 1) {
            addHistory(history, root, `Root [${root.keys.join(',')}] is full. Creating new root and splitting old root.`, root.value);
            const newRoot = new Node(0); // Dummy value
            newRoot.isLeaf = false;
            newRoot.children.push(root);
            root.parent = newRoot;
            
            splitChild(newRoot, 0, order);
            insertNonFull(newRoot, key, order);
            root = newRoot;
        } else {
            insertNonFull(root, key, order);
        }
    }
    
    addHistory(history, root, `B-Tree insertion of ${key} complete.`);
    return history;
};


// --- B-Tree Deletion ---

function findKey(node: Node, k: number): [boolean, number] {
    let idx = 0;
    // Find the first key that is >= k
    while (idx < node.keys.length && node.keys[idx] < k) {
        idx++;
    }
    return [idx < node.keys.length && node.keys[idx] === k, idx];
}

function removeFromLeaf(node: Node, idx: number) {
    const root = node.getRoot();
    if (!root) return;
    const key = node.keys[idx];
    node.keys.splice(idx, 1);
    addHistory(history, root, `Case 1: Key ${key} is in a leaf with enough keys. Removed it directly.`, key);
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

function borrowFromPrev(node: Node, idx: number) {
    const root = node.getRoot();
    if (!root) return;
    const child = node.children[idx];
    const sibling = node.children[idx - 1];
    const parentKey = node.keys[idx-1];

    addHistory(history, root, `Case 3a: Child has t-1 keys. Borrowing from left sibling [${sibling.keys.join(',')}] through parent.`, parentKey, undefined, child.value);
    
    // Move parent key down to child
    child.keys.unshift(parentKey);
    
    // Move sibling's last key up to parent
    node.keys[idx - 1] = sibling.keys.pop()!;

    // Move sibling's last child to child's first child
    if (!sibling.isLeaf) {
        const childToMove = sibling.children.pop()!;
        childToMove.parent = child;
        child.children.unshift(childToMove);
    }
    addHistory(history, root, `Borrow complete.`, parentKey, undefined, child.value);
}

function borrowFromNext(node: Node, idx: number) {
    const root = node.getRoot();
    if (!root) return;
    const child = node.children[idx];
    const sibling = node.children[idx + 1];
    const parentKey = node.keys[idx];
    
    addHistory(history, root, `Case 3a: Child has t-1 keys. Borrowing from right sibling [${sibling.keys.join(',')}] through parent.`, parentKey, undefined, child.value);

    // Move parent key down to child
    child.keys.push(parentKey);
    
    // Move sibling's first key up to parent
    node.keys[idx] = sibling.keys.shift()!;

    // Move sibling's first child to child's last child
    if (!sibling.isLeaf) {
        const childToMove = sibling.children.shift()!;
        childToMove.parent = child;
        child.children.push(childToMove);
    }
    addHistory(history, root, `Borrow complete.`, parentKey, undefined, child.value);
}

function merge(node: Node, idx: number) {
    const root = node.getRoot();
    if (!root) return;
    const child = node.children[idx];
    const sibling = node.children[idx + 1];
    const parentKey = node.keys[idx];
    
    addHistory(history, root, `Case 2c/3b: Merging child [${child.keys.join(',')}] and sibling [${sibling.keys.join(',')}] around parent key ${parentKey}.`, parentKey);

    // Move parent key down to child
    child.keys.push(parentKey);
    
    // Move sibling's keys and children to child
    child.keys.push(...sibling.keys);
    if (!child.isLeaf) {
        child.children.push(...sibling.children);
        child.children.forEach(c => c.parent = child);
    }
    
    // Remove key and child pointer from parent
    node.keys.splice(idx, 1);
    node.children.splice(idx + 1, 1);
    
    addHistory(history, root, `Merge complete. New merged node: [${child.keys.join(',')}]`, undefined, undefined, child.value);
}

function fill(node: Node, idx: number, order: number) {
    const t = order;
    if (idx !== 0 && node.children[idx - 1].keys.length >= t) {
        borrowFromPrev(node, idx);
    } else if (idx !== node.keys.length && node.children[idx + 1].keys.length >= t) {
        borrowFromNext(node, idx);
    } else {
        if (idx !== node.keys.length) {
            merge(node, idx);
        } else {
            merge(node, idx - 1);
        }
    }
}

function removeFromNonLeaf(node: Node, idx: number, order: number) {
    const root = node.getRoot();
    if (!root) return;
    const k = node.keys[idx];
    const t = order;
    
    const predChild = node.children[idx];
    const succChild = node.children[idx + 1];

    if (predChild.keys.length >= t) {
        const pred = getPred(node, idx);
        addHistory(history, root, `Case 2a: Predecessor child [${predChild.keys.join(',')}] has >= t keys. Replacing ${k} with predecessor ${pred}.`, k, pred);
        node.keys[idx] = pred;
        deleteBTreeRecursive(predChild, pred, order);
    } else if (succChild.keys.length >= t) {
        const succ = getSucc(node, idx);
        addHistory(history, root, `Case 2b: Successor child [${succChild.keys.join(',')}] has >= t keys. Replacing ${k} with successor ${succ}.`, k, succ);
        node.keys[idx] = succ;
        deleteBTreeRecursive(succChild, succ, order);
    } else {
        addHistory(history, root, `Case 2c: Both children have t-1 keys. Merging them with ${k}.`, k);
        merge(node, idx);
        deleteBTreeRecursive(predChild, k, order);
    }
}

function deleteBTreeRecursive(node: Node, k: number, order: number) {
    const root = node.getRoot();
    if (!root) return;
    const t = order;
    const [keyFound, idx] = findKey(node, k);
    
    addHistory(history, root, `Searching for key ${k} in node [${node.keys.join(',')}]`, k, undefined, node.value);

    if (keyFound) { // Key k is in this node
        if (node.isLeaf) {
            removeFromLeaf(node, idx);
        } else {
            removeFromNonLeaf(node, idx, order);
        }
    } else { // Key k is not in this node, go to child
        if (node.isLeaf) {
            addHistory(history, root, `Key ${k} not found in the tree.`);
            return;
        }

        const childIdx = idx;
        const isLastChild = (childIdx === node.children.length);
        
        // Ensure child has at least t keys before descending
        if (node.children[childIdx].keys.length < t) {
            addHistory(history, root, `Child [${node.children[childIdx].keys.join(',')}] has less than t keys. Must rebalance.`, undefined, undefined, node.children[childIdx].value);
            fill(node, childIdx, order);
        }
        
        // After fill, the child to descend into might have changed if a merge happened
        const newChildIdx = childIdx > node.keys.length ? childIdx - 1 : childIdx;
        
        deleteBTreeRecursive(node.children[newChildIdx], k, order);
    }
}

export const deleteBTree = (initialRoot: Node | null, k: number, order: number): HistoryStep[] => {
    history = [];
    let root = deepCloneNode(initialRoot);
    if (!root) {
        addHistory(history, null, `Tree is empty. Cannot delete.`);
        return [{ tree: null, message: 'Tree is empty. Cannot delete.' }];
    }
    
    addHistory(history, root, `Starting B-Tree deletion of key ${k} with order T=${order}.`);

    if (!findNodeWithKey(root, k)) {
        addHistory(history, root, `Key ${k} not found in the tree.`);
         return [{ tree: root, message: `Key ${k} not found in the tree.` }];
    }

    deleteBTreeRecursive(root, k, order);
    
    // If the root node has no keys, make its first child the new root.
    if (root.keys.length === 0) {
        addHistory(history, root, `Root became empty. Updating root to its first child.`);
        if (root.isLeaf) { // Tree is now empty
            root = null;
        } else {
            const newRoot = root.children[0];
            if (newRoot) newRoot.parent = null;
            root = newRoot;
        }
    }

    addHistory(history, root, `B-Tree deletion of ${k} complete.`);
    return history;
};

    