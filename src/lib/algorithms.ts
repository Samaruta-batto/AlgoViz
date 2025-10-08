import { Node, HistoryStep } from './types';

// --- UTILITIES ---

const deepCloneNode = (node: Node | null, parent: Node | null = null): Node | null => {
    if (!node) return null;

    const newNode = new Node(node.value, node.x, node.y, node.color, parent);
    newNode.highlighted = node.highlighted;
    newNode.keys = [...node.keys];
    newNode.isLeaf = node.isLeaf;

    newNode.left = deepCloneNode(node.left, newNode);
    newNode.right = deepCloneNode(node.right, newNode);
    
    newNode.children = node.children.map(child => deepCloneNode(child, newNode));

    return newNode;
};

const addHistory = (history: HistoryStep[], tree: Node | null, message: string, highlightNodeValue?: number, highlightKey?: number, secondaryHighlightNodeValue?: number) => {
    const clonedTree = deepCloneNode(tree);
    if (clonedTree) {
        // Clear previous highlights
        const clearHighlights = (n: Node) => {
            n.highlighted = false;
            if(n.left) clearHighlights(n.left);
            if(n.right) clearHighlights(n.right);
            n.children.forEach(clearHighlights);
        };
        clearHighlights(clonedTree);

        const findAndHighlight = (n: Node, val: number, isSecondary: boolean) => {
             if (n.value === val || (n.keys.includes(val) && n.children.length > 0)) {
                n.highlighted = true;
                if(isSecondary) {
                    // special case handled in drawing
                }
            }
            if(n.left) findAndHighlight(n.left, val, isSecondary);
            if(n.right) findAndHighlight(n.right, val, isSecondary);
            n.children.forEach(c => findAndHighlight(c, val, isSecondary));
        }

        if (highlightNodeValue !== undefined && highlightNodeValue !== null) {
            findAndHighlight(clonedTree, highlightNodeValue, false);
        }
        if (secondaryHighlightNodeValue !== undefined && secondaryHighlightNodeValue !== null) {
             findAndHighlight(clonedTree, secondaryHighlightNodeValue, true);
        }
    }
    history.push({ tree: clonedTree, message, highlightNodeValue, highlightKey, secondaryHighlightNodeValue });
};


const treeMinimum = (node: Node): Node => {
    let current = node;
    while (current.left) {
        current = current.left;
    }
    return current;
};

// --- BST ---

export const insertBST = (initialRoot: Node | null, value: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting BST insertion for value ${value}.`);

    if (!root) {
        root = new Node(value, 0, 0, 'black');
        addHistory(history, root, `Tree is empty. Creating new root with value ${value}.`, value);
        return history;
    }

    let current: Node | null = root;
    let parent: Node | null = null;

    while (current) {
        addHistory(history, root, `Comparing ${value} with current node's value ${current.value}.`, current.value);
        parent = current;
        if (value < current.value) {
            addHistory(history, root, `${value} < ${current.value}. Moving to the left child.`, current.left?.value);
            current = current.left;
        } else if (value > current.value) {
            addHistory(history, root, `${value} > ${current.value}. Moving to the right child.`, current.right?.value);
            current = current.right;
        } else {
            addHistory(history, root, `Value ${value} already exists in the tree. No changes made.`, current.value);
            return history;
        }
    }

    const newNode = new Node(value, 0, 0, 'black', parent);
    if (parent) {
        if (value < parent.value) {
            parent.left = newNode;
            addHistory(history, root, `Found null left child. Inserting ${value} as left child of ${parent.value}.`, value);
        } else {
            parent.right = newNode;
            addHistory(history, root, `Found null right child. Inserting ${value} as right child of ${parent.value}.`, value);
        }
    }

    addHistory(history, root, `BST insertion of ${value} complete. Tree is stable.`);
    return history;
};

export const deleteBST = (initialRoot: Node | null, value: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
     addHistory(history, initialRoot, `BST Deletion not implemented.`);
    return history;
}

// --- RBT ---

const rotateLeft = (root: Node, x: Node): Node => {
    const y = x.right!;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
    return root;
};

const rotateRight = (root: Node, y: Node): Node => {
    const x = y.left!;
    y.left = x.right;
    if (x.right) x.right.parent = y;
    x.parent = y.parent;
    if (!y.parent) root = x;
    else if (y === y.parent.left) y.parent.left = x;
    else y.parent.right = x;
    x.right = y;
    y.parent = x;
    return root;
};

const rbTransplant = (root: Node | null, u: Node, v: Node | null): Node | null => {
    if (!u.parent) root = v;
    else if (u === u.parent.left) u.parent.left = v;
    else u.parent.right = v;
    if (v) v.parent = u.parent;
    return root;
};

const fixupRBTree = (root: Node, z: Node, history: HistoryStep[]): Node => {
    let current = z;
    while (current.parent && current.parent.color === 'red') {
        const p = current.parent;
        const g = p.parent;
        if (!g) break;

        const side = p === g.left ? 'left' : 'right';
        const u = side === 'left' ? g.right : g.left;

        addHistory(history, root, `Parent (${p.value}) is RED. Checking uncle.`, current.value, p.value, u?.value);
        if (u && u.color === 'red') {
            addHistory(history, root, `Case 1: Uncle (${u.value}) is RED. Recolor parent, uncle, and grandparent.`, g.value);
            p.color = 'black';
            u.color = 'black';
            g.color = 'red';
            current = g;
            addHistory(history, root, `Recoloring complete. Moving up to grandparent (${g.value}) to re-check.`, current.value);
        } else {
            if ((side === 'left' && current === p.right) || (side === 'right' && current === p.left)) {
                addHistory(history, root, `Case 2: Uncle is BLACK and node is inner child. Rotating parent (${p.value}).`, p.value);
                current = p;
                root = side === 'left' ? rotateLeft(root, current) : rotateRight(root, current);
                addHistory(history, root, `Rotation complete. Now in Case 3.`, current.parent!.value);
            }
            const newP = current.parent!;
            const newG = newP.parent!;
            addHistory(history, root, `Case 3: Uncle is BLACK and node is outer child. Recolor parent and grandparent, then rotate grandparent.`, newG.value);
            newP.color = 'black';
            newG.color = 'red';
            root = side === 'left' ? rotateRight(root, newG) : rotateLeft(root, newG);
            addHistory(history, root, `Fixup complete for this level.`, newP.value);
        }
    }

    if (root.color === 'red') {
        addHistory(history, root, `Root is RED. Forcing root to be BLACK.`, root.value);
        root.color = 'black';
    }
    return root;
};

export const insertRBTree = (initialRoot: Node | null, value: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting Red-Black Tree insertion for value ${value}.`);

    if (!root) {
        root = new Node(value, 0, 0, 'black');
        addHistory(history, root, `Tree is empty. New root is ${value}, color is BLACK.`, value);
        return history;
    }

    let current: Node | null = root;
    let parent: Node | null = null;
    while (current) {
        addHistory(history, root, `Comparing ${value} with ${current.value}.`, current.value);
        parent = current;
        if (value < current.value) current = current.left;
        else if (value > current.value) current = current.right;
        else {
            addHistory(history, root, `Value ${value} already exists.`, current.value);
            return history;
        }
    }

    const newNode = new Node(value, 0, 0, 'red', parent);
    if (parent) {
        if (value < parent.value) parent.left = newNode;
        else parent.right = newNode;
        addHistory(history, root, `Inserting ${value} as RED node.`, value);
    }

    root = fixupRBTree(root, newNode, history);
    addHistory(history, root, `Insertion of ${value} complete. Tree is balanced.`);
    return history;
};

const fixupRBDelete = (root: Node, x: Node, history: HistoryStep[]): Node => {
    let current = x;
    while (current !== root && current.color === 'black') {
        const p = current.parent!;
        if (current === p.left) {
            let w = p.right!; // Sibling
            addHistory(history, root, `Double-black on node (${current.value}). Sibling is ${w.value}.`, current.value, w.value);

            if (w.color === 'red') {
                addHistory(history, root, `Case 1: Sibling ${w.value} is RED. Recolor sibling and parent, rotate parent ${p.value} left.`, w.value, p.value);
                w.color = 'black';
                p.color = 'red';
                root = rotateLeft(root, p);
                w = p.right!;
                addHistory(history, root, `Now in a new case. New sibling is ${w.value}.`, current.value, w.value);
            }
            if ((!w.left || w.left.color === 'black') && (!w.right || w.right.color === 'black')) {
                addHistory(history, root, `Case 2: Sibling ${w.value} is BLACK and its children are BLACK. Recolor sibling to RED.`, w.value);
                w.color = 'red';
                current = p;
                addHistory(history, root, `Problem moves up to parent ${current.value}. Re-checking.`, current.value);
            } else {
                if (!w.right || w.right.color === 'black') {
                    addHistory(history, root, `Case 3: Sibling ${w.value} is BLACK, near child is RED. Recolor sibling and its left child, rotate sibling right.`, w.value, w.left?.value);
                    if(w.left) w.left.color = 'black';
                    w.color = 'red';
                    root = rotateRight(root, w);
                    w = p.right!;
                    addHistory(history, root, `Now in Case 4.`, w.value);
                }
                addHistory(history, root, `Case 4: Sibling ${w.value} is BLACK, far child is RED. Recolor sibling, rotate parent ${p.value} left.`, w.value, p.value);
                w.color = p.color;
                p.color = 'black';
                if(w.right) w.right.color = 'black';
                root = rotateLeft(root, p);
                current = root; // Terminate
            }
        } else { // Mirror cases
            let w = p.left!;
             addHistory(history, root, `Double-black on node (${current.value}). Sibling is ${w.value}.`, current.value, w.value);
            if (w.color === 'red') {
                 addHistory(history, root, `Case 1 (mirror): Sibling ${w.value} is RED. Recolor, rotate parent ${p.value} right.`, w.value, p.value);
                w.color = 'black';
                p.color = 'red';
                root = rotateRight(root, p);
                w = p.left!;
                 addHistory(history, root, `Now in a new case. New sibling is ${w.value}.`, current.value, w.value);
            }
            if ((!w.left || w.left.color === 'black') && (!w.right || w.right.color === 'black')) {
                 addHistory(history, root, `Case 2 (mirror): Sibling ${w.value} BLACK, children BLACK. Recolor sibling.`, w.value);
                w.color = 'red';
                current = p;
                 addHistory(history, root, `Problem moves up to parent ${current.value}. Re-checking.`, current.value);
            } else {
                if (!w.left || w.left.color === 'black') {
                     addHistory(history, root, `Case 3 (mirror): Sibling ${w.value} BLACK, near child RED. Recolor, rotate sibling left.`, w.value, w.right?.value);
                    if(w.right) w.right.color = 'black';
                    w.color = 'red';
                    root = rotateLeft(root, w);
                    w = p.left!;
                    addHistory(history, root, `Now in Case 4.`, w.value);
                }
                 addHistory(history, root, `Case 4 (mirror): Sibling ${w.value} BLACK, far child RED. Recolor, rotate parent ${p.value} right.`, w.value, p.value);
                w.color = p.color;
                p.color = 'black';
                if(w.left) w.left.color = 'black';
                root = rotateRight(root, p);
                current = root; // Terminate
            }
        }
    }
    if (current) {
        addHistory(history, root, `Extra black resolved. Finalizing by coloring node ${current.value} BLACK.`, current.value);
        current.color = 'black';
    }
    return root;
};


export const deleteRBTree = (initialRoot: Node | null, value: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    if (!root) {
        addHistory(history, null, `Cannot delete ${value}, tree is empty.`);
        return history;
    }
    addHistory(history, root, `Starting RBT deletion for ${value}.`);

    let z: Node | null = root;
    while (z) {
        addHistory(history, root, `Searching... comparing ${value} with ${z.value}.`, z.value);
        if (value < z.value) z = z.left;
        else if (value > z.value) z = z.right;
        else break;
    }

    if (!z) {
        addHistory(history, root, `Value ${value} not found in tree.`);
        return history;
    }
    addHistory(history, root, `Found node to delete with value ${value}.`, z.value);

    let y = z;
    let yOriginalColor = y.color;
    let x: Node | null = null;

    if (!z.left) {
        x = z.right;
        addHistory(history, root, `Node has no left child. Replacing with right child.`, z.value, x?.value);
        root = rbTransplant(root, z, z.right);
    } else if (!z.right) {
        x = z.left;
        addHistory(history, root, `Node has no right child. Replacing with left child.`, z.value, x?.value);
        root = rbTransplant(root, z, z.left);
    } else {
        y = treeMinimum(z.right);
        yOriginalColor = y.color;
        x = y.right;
        addHistory(history, root, `Node has two children. Finding successor: ${y.value}.`, z.value, y.value);
        
        if (y.parent === z) {
            if (x) x.parent = y;
        } else {
            addHistory(history, root, `Successor is not a direct child. Transplanting successor's child.`, y.value, x?.value);
            root = rbTransplant(root, y, y.right);
            y.right = z.right;
            y.right.parent = y;
        }
        addHistory(history, root, `Replacing deleted node with successor.`, z.value, y.value);
        root = rbTransplant(root, z, y);
        y.left = z.left;
        y.left.parent = y;
        y.color = z.color;
    }

    if (yOriginalColor === 'black') {
        addHistory(history, root, `Deleted node was BLACK. This may violate RBT properties. Initiating fixup procedure.`, x?.value);
        if (x) root = fixupRBDelete(root!, x, history);
    }
    
    addHistory(history, root, `Deletion of ${value} complete. Tree is balanced.`);
    return history;
};


// --- B-Tree ---

const splitChild = (x: Node, i: number, history: HistoryStep[], order: number) => {
    const maxKeys = 2 * order - 1;
    const y = x.children[i];
    addHistory(history, x, `Node with keys [${x.keys.join(',')}] has a full child [${y.keys.join(',')}] at index ${i}. Splitting it.`, x.value, y.keys[order - 1]);
    
    const z = new Node(0); // value is irrelevant, will be overwritten
    z.isLeaf = y.isLeaf;
    z.parent = x;

    z.keys = y.keys.splice(order); // t to 2t-2 keys go to z
    y.keys.splice(order-1); // median key is removed from y

    if (!y.isLeaf) {
        z.children = y.children.splice(order);
        z.children.forEach(c => c.parent = z);
    }
    
    x.children.splice(i + 1, 0, z);
    const median = y.keys[order-1]; // this is now incorrect, y has been spliced.
    
    // Correctly get median before splice
    const y_keys_original = [...y.keys, ...z.keys]; // just for getting median
    const median_key_from_y = y_keys_original[order - 1];
    
    x.keys.splice(i, 0, median_key_from_y);

    y.keys = y.keys.slice(0, order-1); // y has t-1 keys

    addHistory(history, x, `Split complete. Median key ${median_key_from_y} promoted to parent. New node [${z.keys.join(',')}] created.`, x.value);
};

const insertNonFull = (x: Node, k: number, history: HistoryStep[], order: number) => {
    addHistory(history, x, `At node [${x.keys.join(',')}]. Searching for insertion spot for key ${k}.`, x.value, k);
    let i = x.keys.length - 1;

    if (x.isLeaf) {
        addHistory(history, x, `Node is a leaf. Inserting key ${k}.`, x.value, k);
        x.keys.push(0); // placeholder
        while (i >= 0 && k < x.keys[i]) {
            x.keys[i + 1] = x.keys[i];
            i--;
        }
        x.keys[i + 1] = k;
        addHistory(history, x, `Key ${k} inserted. Leaf is now [${x.keys.join(',')}].`, x.value);
    } else {
        while (i >= 0 && k < x.keys[i]) {
            i--;
        }
        i++;
        addHistory(history, x, `Key ${k} fits in child at index ${i}. Descending...`, x.children[i].value);
        if (x.children[i].keys.length === 2 * order - 1) {
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
        addHistory(history, root, `Tree is empty. Created new root with key ${k}.`, k);
        return history;
    }
    
    if (root.keys.find(key => key === k)) {
        addHistory(history, root, `Key ${k} already exists. No changes made.`);
        return history;
    }

    if (root.keys.length === 2 * order - 1) {
        addHistory(history, root, `Root is full. Splitting root before insertion.`, root.value);
        const s = new Node(0);
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

export const deleteBTree = (initialRoot: Node | null, k: number, order: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    addHistory(history, initialRoot, `B-Tree Deletion not implemented.`);
    return history;
}
