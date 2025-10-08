export interface ForkProcess {
  pid: number;
  ppid: number;
  children: number[];
  depth: number;
  x: number;
  y: number;
}

let nextPid = 1;
const outputLog: string[] = [];

const createProcess = (ppid: number, depth: number): ForkProcess => {
  return {
    pid: nextPid++,
    ppid,
    children: [],
    depth,
    x: 0,
    y: 0,
  };
};

const findProcessInTree = (root: ForkProcess, pid: number): ForkProcess | null => {
    const queue: ForkProcess[] = [root];
    const visited = new Set<number>();

    while(queue.length > 0) {
        const current = queue.shift()!;
        if(visited.has(current.pid)) continue;
        visited.add(current.pid);

        if (current.pid === pid) return current;

        // This is inefficient; a flat map is better.
        // For now, we manually search. A better implementation would pass the map around.
        // This part of the logic requires finding the actual child objects, not just PIDs.
        // Let's assume a flat map is built elsewhere before calling this.
    }
    return null;
}


const executeCode = (lines: string[], process: ForkProcess, processMap: Map<number, ForkProcess>, startLine: number, isChildOfFork: boolean) => {
  let isExecuting = true;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!isExecuting) {
      if (line === '}') {
        isExecuting = true;
      }
      continue;
    }

    if (line.startsWith('printf')) {
      const match = line.match(/printf\("([^"]*)"\)/);
      if (match) {
        const output = match[1].replace(/\\n/g, '\n');
        outputLog.push(`[PID ${process.pid}]: ${output}`);
      }
    } else if (line.includes('fork()')) {
      const newProcess = createProcess(process.pid, process.depth + 1);
      process.children.push(newProcess.pid);
      processMap.set(newProcess.pid, newProcess);
      
      // Child process continues from the next line
      executeCode(lines, newProcess, processMap, i, true);

      // Parent process continues
      // Check for if/else structure
      const nextLine = lines[i + 1]?.trim();
      if (nextLine === '{') {
         // This is the parent's block after an `if(fork() == 0)`
         // We need to skip it.
         let braceCount = 1;
         let j = i + 2;
         while(j < lines.length && braceCount > 0) {
             const l = lines[j].trim();
             if (l === '{') braceCount++;
             if (l === '}') braceCount--;
             j++;
         }
         i = j - 1;

         // Check if there is an `else` block for the parent to execute
         const elseLine = lines[j]?.trim();
         if(elseLine === 'else') {
             // Let the parent continue into the else block
         } else {
            // No else block, parent continues after the if block
            i = j -1;
         }

      }

    } else if (line.startsWith('if (fork() == 0)')) {
        const newProcess = createProcess(process.pid, process.depth + 1);
        process.children.push(newProcess.pid);
        processMap.set(newProcess.pid, newProcess);
        
        // Child executes the if block
        executeCode(lines, newProcess, processMap, i + 1, true);

        // Parent skips the if block and looks for an else
        let braceCount = 0;
        let j = i + 1;
        do {
            const l = lines[j]?.trim();
            if (l === '{') braceCount++;
            else if (l === '}') braceCount--;
            j++;
        } while (j < lines.length && braceCount > 0);

        if (lines[j]?.trim() === 'else') {
            // Parent continues execution from inside the else block
             i = j; // The loop will increment to start inside the else block
        } else {
            // Parent skips the if block entirely
            i = j - 1;
        }

    } else if (line === 'else') {
        if (isChildOfFork) {
            // A child from `if(fork() == 0)` should not execute the else block
            isExecuting = false;
        }
    }
  }
};


export const parseAndRunFork = (code: string): { rootProcess: ForkProcess; output: string[] } => {
  nextPid = 1;
  outputLog.length = 0;
  
  const rootProcess = createProcess(0, 0); // PID 1, PPID 0
  const processMap = new Map<number, ForkProcess>();
  processMap.set(rootProcess.pid, rootProcess);
  
  const lines = code.split('\n').filter(line => line.trim() !== '');

  executeCode(lines, rootProcess, processMap, 0, false);

  return { rootProcess, output: [...outputLog] };
};
