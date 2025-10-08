
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
    addHistory(history, deepCloneNode(x.getRoot()), `Node [${y.keys.join(',')}] is full. Splitting it.`, y.keys.length > 0 ? y.keys[0] : undefined, undefined, x.keys.length > 0 ? x.keys[0] : undefined);
    
    const z = new Node(0); // value is irrelevant
    z.isLeaf = y.isLeaf;
    z.parent = x;

    const medianKey = y.keys[order - 1];

    z.keys = y.keys.splice(order); 
    y.keys.pop(); // remove median key from y

    if (!y.isLeaf) {
        z.children = y.children.splice(order);
        z.children.forEach(c => { c.parent = z; });
    }
    
    x.children.splice(i + 1, 0, z);
    x.keys.splice(i, 0, medianKey);
    
    y.value = y.keys.length > 0 ? y.keys[0] : -1;
    z.value = z.keys.length > 0 ? z.keys[0] : -1;
    x.value = x.keys.length > 0 ? x.keys[0] : -1;

    addHistory(history, deepCloneNode(x.getRoot()), `Split complete. Median key ${medianKey} promoted to parent [${x.keys.join(',')}].`, medianKey, undefined, x.keys.length > 0 ? x.keys[0] : undefined);
};

const insertNonFull = (x: Node, k: number, history: HistoryStep[], order: number) => {
    addHistory(history, deepCloneNode(x.getRoot()), `At node [${x.keys.join(',')}]. Searching for insertion spot for key ${k}.`, x.keys.length > 0 ? x.keys[0] : undefined, k);
    let i = x.keys.length - 1;

    if (x.isLeaf) {
        addHistory(history, deepCloneNode(x.getRoot()), `Node is a leaf. Inserting key ${k}.`, x.keys.length > 0 ? x.keys[0] : undefined, k);
        x.keys.push(0); // placeholder
        while (i >= 0 && k < x.keys[i]) {
            x.keys[i + 1] = x.keys[i];
            i--;
        }
        x.keys[i + 1] = k;
        x.value = x.keys[0]; // Update representative value
        addHistory(history, deepCloneNode(x.getRoot()), `Key ${k} inserted. Leaf is now [${x.keys.join(',')}].`, x.keys.length > 0 ? x.keys[0] : undefined, k);
    } else {
        while (i >= 0 && k < x.keys[i]) {
            i--;
        }
        i++;
        
        let childToInsertIn = x.children[i];
        
        addHistory(history, deepCloneNode(x.getRoot()), `Key ${k} fits in child [${childToInsertIn.keys.join(',')}]. Descending...`, x.keys.length > 0 ? x.keys[0] : undefined, undefined, childToInsertIn.keys.length > 0 ? childToInsertIn.keys[0] : undefined);
        
        if (childToInsertIn.keys.length === 2 * order - 1) {
            splitChild(x, i, history, order);
            if (k > x.keys[i]) {
                i++; 
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
        return [{ tree: root, message: `Key ${k} already exists in the tree.` }];
    }

    if (root.keys.length === 2 * order - 1) {
        addHistory(history, root, `Root [${root.keys.join(',')}] is full. Splitting root before insertion.`, root.keys.length > 0 ? root.keys[0] : undefined);
        const s = new Node(0); // Dummy value
        s.isLeaf = false;
        s.children.push(root);
        root.parent = s;
        splitChild(s, 0, history, order);
        root = s; 
        insertNonFull(root, k, history, order);
    } else {
        insertNonFull(root, k, history, order);
    }
    
    addHistory(history, root, `B-Tree insertion of ${k} complete.`);
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
