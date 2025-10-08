import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode, treeMinimum } from './utils';

// --- Rotations ---
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

// --- Transplant ---
const rbTransplant = (root: Node | null, u: Node, v: Node | null): Node | null => {
    if (!u.parent) root = v;
    else if (u === u.parent.left) u.parent.left = v;
    else u.parent.right = v;
    if (v) v.parent = u.parent;
    return root;
};


// --- Insertion ---

const fixupRBTree = (root: Node, z: Node, history: HistoryStep[]): Node => {
    let current = z;
    while (current.parent && current.parent.color === 'red') {
        const p = current.parent;
        const g = p.parent;
        if (!g) break;

        const side = p === g.left ? 'left' : 'right';
        const u = side === 'left' ? g.right : g.left;

        addHistory(history, root, `Parent (${p.value}) is RED. Checking uncle.`, current.value, undefined, u?.value);
        if (u && u.color === 'red') {
            addHistory(history, root, `Case 1: Uncle (${u.value}) is RED. Recolor parent, uncle, and grandparent.`, g.value, undefined, u.value);
            p.color = 'black';
            u.color = 'black';
            g.color = 'red';
            current = g;
            addHistory(history, root, `Recoloring complete. Moving up to grandparent (${g.value}) to re-check.`, current.value);
        } else {
            if ((side === 'left' && current === p.right) || (side === 'right' && current === p.left)) {
                current = p;
                addHistory(history, root, `Case 2: Uncle is BLACK and node is inner child. Rotating parent (${current.value}).`, current.value);
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
        addHistory(history, root, `Inserting ${value} as RED node.`, value, undefined, parent.value);
    } else { // Should not happen if root already exists
        root = newNode;
    }

    root = fixupRBTree(root, newNode, history);
    addHistory(history, root, `Insertion of ${value} complete. Tree is balanced.`);
    return history;
};

// --- Deletion ---

const fixupRBDelete = (root: Node, x: Node, xParent: Node, history: HistoryStep[]): Node => {
    let current = x;
    let currentParent = xParent;

    while (current !== root && (!current || current.color === 'black')) {
        if (current === currentParent.left) {
            let w = currentParent.right; // Sibling
            if (!w) break; // Should not happen in a valid RBT if we have a double black problem
            
            addHistory(history, root, `Double-black problem. Sibling is ${w.value}.`, currentParent.value, undefined, w.value);

            if (w.color === 'red') {
                addHistory(history, root, `Case 1: Sibling ${w.value} is RED. Recolor sibling and parent, rotate parent ${currentParent.value} left.`, w.value, undefined, currentParent.value);
                w.color = 'black';
                currentParent.color = 'red';
                root = rotateLeft(root, currentParent);
                w = currentParent.right!;
                addHistory(history, root, `Now in a new case. New sibling is ${w.value}.`, currentParent.value, undefined, w.value);
            }

            if ((!w.left || w.left.color === 'black') && (!w.right || w.right.color === 'black')) {
                addHistory(history, root, `Case 2: Sibling ${w.value} is BLACK and its children are BLACK. Recolor sibling to RED.`, w.value);
                w.color = 'red';
                current = currentParent;
                currentParent = current.parent!;
                 if (!currentParent) break;
                addHistory(history, root, `Problem moves up to parent ${current.value}. Re-checking.`, current.value);
            } else {
                if (!w.right || w.right.color === 'black') {
                    addHistory(history, root, `Case 3: Sibling ${w.value} is BLACK, near child is RED. Recolor sibling and its left child, rotate sibling right.`, w.value, undefined, w.left?.value);
                    if(w.left) w.left.color = 'black';
                    w.color = 'red';
                    root = rotateRight(root, w);
                    w = currentParent.right!;
                    addHistory(history, root, `Now in Case 4. New sibling is ${w.value}.`, w.value);
                }
                addHistory(history, root, `Case 4: Sibling ${w.value} is BLACK, far child is RED. Recolor, rotate parent ${currentParent.value} left.`, w.value, undefined, currentParent.value);
                w.color = currentParent.color;
                currentParent.color = 'black';
                if(w.right) w.right.color = 'black';
                root = rotateLeft(root, currentParent);
                current = root; // Terminate
            }
        } else { // Mirror cases
            let w = currentParent.left;
            if (!w) break;

            addHistory(history, root, `Double-black problem (mirror). Sibling is ${w.value}.`, currentParent.value, undefined, w.value);
            
            if (w.color === 'red') {
                 addHistory(history, root, `Case 1 (mirror): Sibling ${w.value} is RED. Recolor, rotate parent ${currentParent.value} right.`, w.value, undefined, currentParent.value);
                w.color = 'black';
                currentParent.color = 'red';
                root = rotateRight(root, currentParent);
                w = currentParent.left!;
                 addHistory(history, root, `Now in a new case. New sibling is ${w.value}.`, currentParent.value, undefined, w.value);
            }
            if ((!w.left || w.left.color === 'black') && (!w.right || w.right.color === 'black')) {
                 addHistory(history, root, `Case 2 (mirror): Sibling ${w.value} BLACK, children BLACK. Recolor sibling.`, w.value);
                w.color = 'red';
                current = currentParent;
                currentParent = current.parent!;
                if (!currentParent) break;
                 addHistory(history, root, `Problem moves up to parent ${current.value}. Re-checking.`, current.value);
            } else {
                if (!w.left || w.left.color === 'black') {
                     addHistory(history, root, `Case 3 (mirror): Sibling ${w.value} BLACK, near child RED. Recolor, rotate sibling left.`, w.value, undefined, w.right?.value);
                    if(w.right) w.right.color = 'black';
                    w.color = 'red';
                    root = rotateLeft(root, w);
                    w = currentParent.left!;
                    addHistory(history, root, `Now in Case 4. New sibling is ${w.value}.`, w.value);
                }
                 addHistory(history, root, `Case 4 (mirror): Sibling ${w.value} BLACK, far child RED. Recolor, rotate parent ${currentParent.value} right.`, w.value, undefined, currentParent.value);
                w.color = currentParent.color;
                currentParent.color = 'black';
                if(w.left) w.left.color = 'black';
                root = rotateRight(root, currentParent);
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
    let xParent: Node | null = null;


    if (!z.left) {
        x = z.right;
        xParent = z.parent;
        addHistory(history, root, `Node has no left child. Splicing out ${z.value} and replacing with its right child.`, z.value, undefined, x?.value);
        root = rbTransplant(root, z, z.right);
    } else if (!z.right) {
        x = z.left;
        xParent = z.parent;
        addHistory(history, root, `Node has no right child. Splicing out ${z.value} and replacing with its left child.`, z.value, undefined, x?.value);
        root = rbTransplant(root, z, z.left);
    } else {
        y = treeMinimum(z.right);
        yOriginalColor = y.color;
        x = y.right;
        xParent = y; // Start fixup from successor's original position
        addHistory(history, root, `Node has two children. Finding successor: ${y.value}.`, z.value, undefined, y.value);
        
        if (y.parent === z) {
            if (x) x.parent = y;
            xParent = y; // Successor is direct child, fixup starts here
        } else {
            xParent = y.parent;
            addHistory(history, root, `Successor is not a direct child. Transplanting successor's right child.`, y.value, undefined, x?.value);
            root = rbTransplant(root, y, y.right);
            y.right = z.right;
            y.right.parent = y;
        }
        addHistory(history, root, `Replacing deleted node ${z.value} with successor ${y.value}.`, z.value, undefined, y.value);
        root = rbTransplant(root, z, y);
        y.left = z.left;
        y.left.parent = y;
        y.color = z.color;
        addHistory(history, root, `Structure updated. Node ${z.value} is gone. Color of ${y.value} is now ${y.color}.`, y.value);
    }

    if (yOriginalColor === 'black') {
        addHistory(history, root, `Original color of removed/moved node was BLACK. This may violate RBT properties. Initiating fixup procedure.`, x?.value ?? xParent?.value);
        if (root && xParent) { // x can be null, but its parent cannot be
             root = fixupRBDelete(root, x!, xParent, history);
        }
    }
    
    addHistory(history, root, `Deletion of ${value} complete. Tree is balanced.`);
    return history;
};
