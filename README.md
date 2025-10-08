# 🚀 AlgoViz Suite: An Interactive Algorithm Visualizer

Welcome to **AlgoViz Suite**, a web-based tool designed to help students, developers, and enthusiasts visualize and understand complex data structures and operating system algorithms. Built with a modern tech stack, this application provides interactive, step-by-step simulations that bring abstract concepts to life.

Whether you're studying for an exam or just curious about how these intricate systems work, AlgoViz Suite offers a hands-on learning experience.

## ✨ Features

The suite is organized into two main domains:

### 1. Data Structures & Algorithms (DAA) Visualizer

Dive deep into the mechanics of fundamental data structures. The DAA visualizer allows you to insert and delete values, and then watch how the structure adapts step-by-step.

- **Binary Search Trees (BST):** The foundational search tree.
- **Red-Black Trees (RBT):** A self-balancing binary search tree.
- **B-Trees:** A self-balancing tree optimized for systems that read and write large blocks of data.
- **Heaps:** A specialized tree-based data structure that satisfies the heap property.
- **Binomial Heaps:** A sophisticated heap structure that supports fast merging.

### 2. Operating Systems (OS) Visualizer

Simulate classic operating system concepts, from process scheduling to memory management.

- **CPU Scheduling Algorithms:** Configure a list of processes with arrival and burst times, and see how different schedulers execute them. A Gantt chart and performance metrics are generated for:
  - First-Come, First-Served (FCFS)
  - Shortest Job First (SJF)
  - Shortest Remaining Time First (SRTF)
  - Longest Job First (LJF)
  - Priority (Preemptive & Non-Preemptive)
  - Round Robin
- **Page Replacement Algorithms:** Visualize how page faults are handled in virtual memory systems with FIFO and LRU algorithms.
- **Process Management (`fork()`):** Write simple C-like code using the `fork()` system call to see how a process tree is created and what the corresponding output would be.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

The application is ready to run. To start the development server, simply run:

```bash
npm run dev
```

This will start the application on `http://localhost:9002`.

- The main entry point is `src/app/page.tsx`, which serves as the landing page.
- The **DAA Visualizer** is located at `src/app/daa/page.tsx`.
- The **OS Visualizer** is located at `src/app/os/page.tsx`.

Feel free to explore the code, add new algorithms, or customize the existing ones!
