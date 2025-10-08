import { Node, HistoryStep } from '../types';

export const deepCloneNode = (node: Node | null, parent: Node | null = null): Node | null => {
    if (!node) return null;

    const newNode = new Node(node.value, node.x, node.y, node.color, parent);
    newNode.highlighted = node.highlighted;
    newNode.secondaryHighlighted = node.secondaryHighlighted;
    newNode.keys = [...(node.keys || [])];
    newNode.isLeaf = node.isLeaf;
    newNode.isBinomialHeap = node.isBinomialHeap;
    newNode.degree = node.degree;


    if (node.left) {
        newNode.left = deepCloneNode(node.left, newNode);
    }
    if (node.right) {
        newNode.right = deepCloneNode(node.right, newNode);
    }
    
    if (node.children) {
        newNode.children = node.children.map(child => deepCloneNode(child, newNode)).filter((child): child is Node => child !== null);
    }
    
    if (node.child) {
        newNode.child = deepCloneNode(node.child, newNode);
    }
    if (node.sibling) {
        // Siblings share the same parent, so the parent should be the same as the current new node's parent
        newNode.sibling = deepCloneNode(node.sibling, parent);
    }


    return newNode;
};

export const addHistory = (history: HistoryStep[], tree: Node | null, message: string, highlightNodeValue?: number, highlightKey?: number, secondaryHighlightNodeValue?: number) => {
    const clonedTree = deepCloneNode(tree);
    if (clonedTree) {
        // This is a way to associate the highlight value with a B-Tree node, since B-Tree nodes don't have a single `value`
        const findAndSetNodeValue = (n: Node) => {
            if (n.keys && n.keys.length > 0) {
                // Heuristic: use the first key as the "value" for highlight matching.
                // This is imperfect but works for many cases.
                n.value = n.keys[0]; 
            }
            if (n.children) {
                n.children.forEach(findAndSetNodeValue);
            }
        }
        findAndSetNodeValue(clonedTree);

        // Clear previous highlights
        const clearHighlights = (n: Node) => {
            n.highlighted = false;
            n.secondaryHighlighted = false;
            if(n.left) clearHighlights(n.left);
            if(n.right) clearHighlights(n.right);
            if (n.children) n.children.forEach(clearHighlights);
            if (n.child) clearHighlights(n.child);
            if (n.sibling) clearHighlights(n.sibling);
        };
        clearHighlights(clonedTree);

        const findAndHighlight = (n: Node, val: number, isSecondary: boolean) => {
             if (n.value === val || (n.keys && n.keys.includes(val))) {
                if(isSecondary) {
                    n.secondaryHighlighted = true;
                } else {
                    n.highlighted = true;
                }
            }
            if(n.left) findAndHighlight(n.left, val, isSecondary);
            if(n.right) findAndHighlight(n.right, val, isSecondary);
            if(n.children) n.children.forEach(c => findAndHighlight(c, val, isSecondary));
            if(n.child) findAndHighlight(n.child, val, isSecondary);
            if(n.sibling) findAndHighlight(n.sibling, val, isSecondary);
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

export const treeMinimum = (node: Node): Node => {
    let current = node;
    while (current.left) {
        current = current.left;
    }
    return current;
};
