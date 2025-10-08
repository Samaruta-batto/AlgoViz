export class Node {
    value: number;
    keys: number[];
    children: Node[];
    left: Node | null;
    right: Node | null;
    parent: Node | null;
    color: 'red' | 'black';
    highlighted: boolean;
    secondaryHighlighted: boolean;
    x: number;
    y: number;

    // B-Tree layout
    modifier: number;
    width: number;
    isLeaf: boolean;

    // Binomial Heap
    degree: number;
    child: Node | null;
    sibling: Node | null;
    isBinomialHeap: boolean;

    constructor(value: number, x = 0, y = 0, color: 'red' | 'black' = 'black', parent: Node | null = null, highlighted = false, secondaryHighlighted = false) {
        this.value = value;
        this.keys = [value];
        this.children = [];
        this.left = null;
        this.right = null;
        this.parent = parent;
        this.color = color;
        this.highlighted = highlighted;
        this.secondaryHighlighted = secondaryHighlighted;
        this.x = x;
        this.y = y;

        // B-Tree specific
        this.modifier = 0;
        this.width = 0;
        this.isLeaf = true;
        
        // Binomial Heap specific
        this.degree = 0;
        this.child = null;
        this.sibling = null;
        this.isBinomialHeap = false;
    }

    getRoot(): Node {
        let current: Node = this;
        while(current.parent) {
            current = current.parent;
        }
        return current;
    }
}

export type HistoryStep = {
    tree: Node | null;
    message: string;
    highlightNodeValue?: number | null;
    highlightKey?: number | null;
    secondaryHighlightNodeValue?: number | null;
};
