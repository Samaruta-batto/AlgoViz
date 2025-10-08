import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode } from './utils';

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


const splitChild = (x: Node, i: number, history: HistoryStep[], order: number) => {
    const y = x.children[i];
    addHistory(history, deepCloneNode(x.getRoot()), `Node [${y.keys.join(',')}] is full. Splitting it.`, y.keys[0], undefined, x.keys[0]);
    
    const z = new Node(0); // value is irrelevant
    z.isLeaf = y.isLeaf;
    z.parent = x;

    const medianKey = y.keys[order - 1];

    z.keys = y.keys.splice(order); // t to 2t-2 keys go to z
    y.keys.splice(order-1); // median key is removed from y

    if (!y.isLeaf) {
        z.children = y.children.splice(order);
        z.children.forEach(c => { c.parent = z; });
    }
    
    x.children.splice(i + 1, 0, z);
    x.keys.splice(i, 0, medianKey);
    
    // Assign correct values to new nodes for highlighting
    y.value = y.keys[0];
    z.value = z.keys[0];
    x.value = x.keys[0];


    addHistory(history, deepCloneNode(x.getRoot()), `Split complete. Median key ${medianKey} promoted to parent [${x.keys.join(',')}].`, medianKey, undefined, x.keys[0]);
};

const insertNonFull = (x: Node, k: number, history: HistoryStep[], order: number) => {
    addHistory(history, deepCloneNode(x.getRoot()), `At node [${x.keys.join(',')}]. Searching for insertion spot for key ${k}.`, x.keys[0], k);
    let i = x.keys.length - 1;

    if (x.isLeaf) {
        addHistory(history, deepCloneNode(x.getRoot()), `Node is a leaf. Inserting key ${k}.`, x.keys[0], k);
        x.keys.push(0); // placeholder
        while (i >= 0 && k < x.keys[i]) {
            x.keys[i + 1] = x.keys[i];
            i--;
        }
        x.keys[i + 1] = k;
        addHistory(history, deepCloneNode(x.getRoot()), `Key ${k} inserted. Leaf is now [${x.keys.join(',')}].`, x.keys[0], k);
    } else {
        while (i >= 0 && k < x.keys[i]) {
            i--;
        }
        i++;
        addHistory(history, deepCloneNode(x.getRoot()), `Key ${k} fits in child at index ${i}. Descending...`, x.keys[0], undefined, x.children[i].keys[0]);
        
        if (x.children[i].keys.length === 2 * order - 1) {
            splitChild(x, i, history, order);
            // After split, the median key moves to x.keys[i].
            // We need to check if k is greater than this new median key.
            if (k > x.keys[i]) {
                i++; // The key k will go into the new sibling node z.
            }
        }
        insertNonFull(x.children[i], k, history, order);
    }
};

export const insertBTree = (initialRoot: Node | null, k: number, order: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting B-Tree insertion of key ${k} with order T=${order}.`);

    if (!root) {
        root = new Node(k);
        root.isLeaf = true;
        addHistory(history, root, `Tree is empty. Created new root with key ${k}.`, k, k);
        addHistory(history, root, `B-Tree insertion of ${k} complete.`);
        return history;
    }
    
    if (findNodeWithKey(root, k)) {
        addHistory(history, root, `Key ${k} already exists. No changes made.`);
        return history;
    }

    if (root.keys.length === 2 * order - 1) {
        addHistory(history, root, `Root [${root.keys.join(',')}] is full. Splitting root before insertion.`, root.keys[0]);
        const s = new Node(0);
        s.isLeaf = false;
        s.children.push(root);
        root.parent = s;
        root = s; // The new root is s
        splitChild(root, 0, history, order);
        insertNonFull(root, k, history, order);
    } else {
        insertNonFull(root, k, history, order);
    }
    
    addHistory(history, root, `B-Tree insertion of ${k} complete.`);
    return history;
};

// --- Deletion ---
// A lot of logic, so we will stub it out for now.
const removeFromLeaf = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
    const key = node.keys[keyIndex];
    node.keys.splice(keyIndex, 1);
    addHistory(history, node.getRoot(), `Removed key ${key} from leaf node.`, node.keys[0] || node.parent?.keys[0]);
};

const removeFromNonLeaf = (node: Node, keyIndex: number, history: HistoryStep[], order: number) => {
     const key = node.keys[keyIndex];
    const predChild = node.children[keyIndex];
    const succChild = node.children[keyIndex + 1];

    addHistory(history, node.getRoot(), `Removing ${key} from internal node.`, key, undefined, node.keys[0]);

    if (predChild.keys.length >= order) {
        const predKey = getPred(node, keyIndex, history);
        addHistory(history, node.getRoot(), `Predecessor child has enough keys. Replacing ${key} with predecessor ${predKey}.`, predKey, undefined, key);
        node.keys[keyIndex] = predKey;
        deleteBTreeRecursive(predChild, predKey, history, order);
    } else if (succChild.keys.length >= order) {
        const succKey = getSucc(node, keyIndex, history);
        addHistory(history, node.getRoot(), `Successor child has enough keys. Replacing ${key} with successor ${succKey}.`, succKey, undefined, key);
        node.keys[keyIndex] = succKey;
        deleteBTreeRecursive(succChild, succKey, history, order);
    } else {
        addHistory(history, node.getRoot(), `Both children have minimum keys. Merging them.`, predChild.keys[0], undefined, succChild.keys[0]);
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
    addHistory(history, node.getRoot(), `Merged nodes around key ${node.keys[keyIndex]}.`, child.keys[0]);
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
     addHistory(history, node.getRoot(), `Borrowed from previous sibling.`, child.keys[0]);
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
    addHistory(history, node.getRoot(), `Borrowed from next sibling.`, child.keys[0]);
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
    addHistory(history, node.getRoot(), `Searching for key ${k} in node [${node.keys.join(',')}]`, node.keys[0], k);

    let keyIndex = node.keys.findIndex(key => key === k);
    
    if (keyIndex !== -1) { // Key is in this node
        if (node.isLeaf) {
            removeFromLeaf(node, keyIndex, history, order);
        } else {
            removeFromNonLeaf(node, keyIndex, history, order);
        }
    } else { // Key is not in this node
        if (node.isLeaf) {
            addHistory(history, node.getRoot(), `Key ${k} not found in the tree.`);
            return;
        }

        let i = 0;
        while (i < node.keys.length && k > node.keys[i]) {
            i++;
        }

        const isLastChild = (i === node.children.length);
        const child = node.children[i];

        if (child.keys.length < order) {
             addHistory(history, node.getRoot(), `Child [${child.keys.join(',')}] has too few keys. Filling it.`, child.keys[0]);
            fill(node, i, history, order);
        }
        
        // After fill, the child to descend into might have changed if we merged.
        // Recalculate child index `i`.
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
        return history;
    }

    deleteBTreeRecursive(root, k, history, order);

    // If root becomes empty, the new root is its first child
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
