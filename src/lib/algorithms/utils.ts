
import { Node, HistoryStep } from '../types';

// Deep clone a node and all its substructure safely
export const deepCloneNode = (node: Node | null, parent: Node | null = null): Node | null => {
    if (!node) return null;

    const newNode = new Node(node.value, node.x, node.y, node.color, parent);

    // Basic property copies
    newNode.highlighted = node.highlighted;
    newNode.secondaryHighlighted = node.secondaryHighlighted;
    newNode.keys = Array.isArray(node.keys) ? [...node.keys] : [];
    newNode.isLeaf = !!node.isLeaf;
    newNode.isBinomialHeap = !!node.isBinomialHeap;
    newNode.degree = node.degree ?? 0;

    // Always initialize children array
    newNode.children = [];

    // Clone binary tree branches
    if (node.left) newNode.left = deepCloneNode(node.left, newNode);
    if (node.right) newNode.right = deepCloneNode(node.right, newNode);

    // Clone n-ary (B-Tree) children
    if (Array.isArray(node.children) && node.children.length > 0) {
        newNode.children = node.children
            .map(child => deepCloneNode(child, newNode))
            .filter((child): child is Node => child !== null);
    }

    // Clone binomial-style child/sibling references if present
    if (node.child) newNode.child = deepCloneNode(node.child, newNode);
    if (node.sibling) newNode.sibling = deepCloneNode(node.sibling, parent);

    return newNode;
};


// Add a step to the history, with safe traversal & highlighting
export const addHistory = (
    history: HistoryStep[],
    tree: Node | null,
    message: string,
    highlightNodeValue?: number,
    highlightKey?: number,
    secondaryHighlightNodeValue?: number
) => {
    const clonedTree = deepCloneNode(tree);
    if (clonedTree) {

        // Assign each node a representative value (for B-Tree highlighting)
        const findAndSetNodeValue = (n: Node) => {
            if (Array.isArray(n.keys) && n.keys.length > 0) {
                n.value = n.keys[0];
            }
            if (Array.isArray(n.children)) n.children.forEach(findAndSetNodeValue);
            if (n.left) findAndSetNodeValue(n.left);
            if (n.right) findAndSetNodeValue(n.right);
            if (n.child) findAndSetNodeValue(n.child);
            if (n.sibling) findAndSetNodeValue(n.sibling);
        };
        findAndSetNodeValue(clonedTree);

        // Clear all highlights recursively
        const clearHighlights = (n: Node) => {
            n.highlighted = false;
            n.secondaryHighlighted = false;
            if (n.left) clearHighlights(n.left);
            if (n.right) clearHighlights(n.right);
            if (Array.isArray(n.children)) n.children.forEach(clearHighlights);
            if (n.child) clearHighlights(n.child);
            if (n.sibling) clearHighlights(n.sibling);
        };
        clearHighlights(clonedTree);

        // Recursive highlighting
        const findAndHighlight = (n: Node, val: number, isSecondary: boolean) => {
            const match =
                n.value === val ||
                (Array.isArray(n.keys) && n.keys.includes(val));

            if (match) {
                if (isSecondary) n.secondaryHighlighted = true;
                else n.highlighted = true;
            }

            if (n.left) findAndHighlight(n.left, val, isSecondary);
            if (n.right) findAndHighlight(n.right, val, isSecondary);
            if (Array.isArray(n.children)) n.children.forEach(c => findAndHighlight(c, val, isSecondary));
            if (n.child) findAndHighlight(n.child, val, isSecondary);
            if (n.sibling) findAndHighlight(n.sibling, val, isSecondary);
        };

        if (highlightNodeValue !== undefined && highlightNodeValue !== null)
            findAndHighlight(clonedTree, highlightNodeValue, false);
        if (secondaryHighlightNodeValue !== undefined && secondaryHighlightNodeValue !== null)
            findAndHighlight(clonedTree, secondaryHighlightNodeValue, true);
    }

    history.push({
        tree: clonedTree,
        message,
        highlightNodeValue,
        highlightKey,
        secondaryHighlightNodeValue
    });
};


// Standard BST utility
export const treeMinimum = (node: Node): Node => {
    let current = node;
    while (current.left) current = current.left;
    return current;
};
