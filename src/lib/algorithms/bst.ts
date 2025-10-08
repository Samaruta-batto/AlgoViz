import { Node, HistoryStep } from '../types';
import { addHistory, deepCloneNode, treeMinimum } from './utils';

export const insertBST = (initialRoot: Node | null, value: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting BST insertion for value ${value}.`);

    if (!root) {
        root = new Node(value, 0, 0, 'black');
        addHistory(history, root, `Tree is empty. Creating new root with value ${value}.`, value);
        addHistory(history, root, `BST insertion of ${value} complete. Tree is stable.`);
        return history;
    }

    let current: Node | null = root;
    let parent: Node | null = null;

    while (current) {
        addHistory(history, root, `Comparing ${value} with current node's value ${current.value}.`, current.value);
        parent = current;
        if (value < current.value) {
            addHistory(history, root, `${value} < ${current.value}. Moving to the left child.`, current.value, undefined, current.left?.value);
            current = current.left;
        } else if (value > current.value) {
            addHistory(history, root, `${value} > ${current.value}. Moving to the right child.`, current.value, undefined, current.right?.value);
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
            addHistory(history, root, `Found null left child. Inserting ${value} as left child of ${parent.value}.`, parent.value, undefined, value);
        } else {
            parent.right = newNode;
            addHistory(history, root, `Found null right child. Inserting ${value} as right child of ${parent.value}.`, parent.value, undefined, value);
        }
    }

    addHistory(history, root, `BST insertion of ${value} complete. Tree is stable.`);
    return history;
};

const deleteNode = (root: Node | null, value: number, history: HistoryStep[]): Node | null => {
    if (!root) {
        addHistory(history, root, `Value ${value} not found.`);
        return null;
    }
    
    addHistory(history, root, `Searching for ${value}. Comparing with ${root.value}.`, root.value);

    if (value < root.value) {
        root.left = deleteNode(root.left, value, history);
        if (root.left) root.left.parent = root;
    } else if (value > root.value) {
        root.right = deleteNode(root.right, value, history);
        if (root.right) root.right.parent = root;
    } else {
        addHistory(history, root, `Found node with value ${value}.`, value);
        // Case 1: No child or one child
        if (!root.left) {
            addHistory(history, root, `Node has no left child. Replacing with right child.`, value, undefined, root.right?.value);
            return root.right;
        }
        if (!root.right) {
            addHistory(history, root, `Node has no right child. Replacing with left child.`, value, undefined, root.left?.value);
            return root.left;
        }

        // Case 3: Two children
        addHistory(history, root, `Node has two children. Finding inorder successor.`, value);
        const successor = treeMinimum(root.right);
        addHistory(history, root, `Inorder successor is ${successor.value}.`, value, undefined, successor.value);
        
        root.value = successor.value; // Copy successor's value
        addHistory(history, root, `Copying successor's value ${successor.value} to the node to be deleted.`, value);

        // Delete the inorder successor from the right subtree
        root.right = deleteNode(root.right, successor.value, history);
        if (root.right) root.right.parent = root;
        addHistory(history, root, `Recursively deleting the original successor node ${successor.value}.`, successor.value);
    }
    return root;
}

export const deleteBST = (initialRoot: Node | null, value: number): HistoryStep[] => {
    const history: HistoryStep[] = [];
    let root = deepCloneNode(initialRoot);
    addHistory(history, root, `Starting BST deletion for value ${value}.`);

    const newRoot = deleteNode(root, value, history);
    
    if(history.length > 2) { // If more than just start/fail message
        addHistory(history, newRoot, `BST deletion of ${value} complete. Tree is stable.`);
    }

    return history;
};
