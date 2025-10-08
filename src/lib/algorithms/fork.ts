
export interface ForkProcess {
  pid: number;
  ppid: number;
  children: ForkProcess[];
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

const executeCode = (lines: string[], process: ForkProcess, startLine: number, endLine: number, isChild: boolean) => {
  for (let i = startLine; i < endLine && i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('printf')) {
      const match = line.match(/printf\("([^"]*)"\)/);
      if (match) {
        const output = match[1].replace(/\\n/g, '\n');
        outputLog.push(`[PID ${process.pid}]: ${output}`);
      }
    } 
    else if (line.startsWith('if (fork() == 0)') || line.startsWith('if(fork() == 0)') || line.startsWith('if(fork()==0)')) {
      const childProcess = createProcess(process.pid, process.depth + 1);
      process.children.push(childProcess);
      
      // Check if brace is on same line
      let braceCount = 0;
      let ifStart = i + 1;
      let ifEnd = i + 1;
      let hasOpenBrace = false;
      
      if (line.includes('{')) {
        // Brace on same line as if
        hasOpenBrace = true;
        ifStart = i + 1;
        braceCount = 1;
        let j = i + 1;
        
        while (j < lines.length && braceCount > 0) {
          const l = lines[j].trim();
          if (l.includes('{')) braceCount++;
          if (l.includes('}')) braceCount--;
          if (braceCount === 0) {
            ifEnd = j;
            break;
          }
          j++;
        }
      } else if (lines[i + 1]?.trim() === '{') {
        // Brace on next line
        hasOpenBrace = true;
        ifStart = i + 2;
        braceCount = 1;
        let j = i + 2;
        
        while (j < lines.length && braceCount > 0) {
          const l = lines[j].trim();
          if (l.includes('{')) braceCount++;
          if (l.includes('}')) braceCount--;
          if (braceCount === 0) {
            ifEnd = j;
            break;
          }
          j++;
        }
      } else {
        // Single line if statement
        ifStart = i + 1;
        ifEnd = i + 2;
      }
      
      // Check for else block
      let elseStart = -1;
      let elseEnd = -1;
      const elseLineIndex = hasOpenBrace ? ifEnd : ifEnd;
      const elseLine = lines[elseLineIndex]?.trim();
      
      // Handle various else patterns: "else", "} else {", "} else", "else {"
      if (elseLine === 'else' || elseLine?.startsWith('else ') || elseLine?.includes('else')) {
        let elseKeywordLine = elseLineIndex;
        
        if (elseLine.includes('}') && elseLine.includes('else')) {
          // Pattern: "} else {" or "} else"
          if (elseLine.includes('{')) {
            // "} else {"
            elseStart = elseLineIndex + 1;
            braceCount = 1;
            let j = elseLineIndex + 1;
            
            while (j < lines.length && braceCount > 0) {
              const l = lines[j].trim();
              if (l.includes('{')) braceCount++;
              if (l.includes('}')) braceCount--;
              if (braceCount === 0) {
                elseEnd = j;
                break;
              }
              j++;
            }
          } else {
            // "} else" - next line is the statement
            elseStart = elseLineIndex + 1;
            elseEnd = elseLineIndex + 2;
          }
        } else if (elseLine === 'else') {
          // "else" on its own line
          if (lines[elseLineIndex + 1]?.trim() === '{' || lines[elseLineIndex + 1]?.trim().startsWith('else {')) {
            // Braced else block
            elseStart = elseLineIndex + 2;
            braceCount = 1;
            let j = elseLineIndex + 2;
            
            while (j < lines.length && braceCount > 0) {
              const l = lines[j].trim();
              if (l.includes('{')) braceCount++;
              if (l.includes('}')) braceCount--;
              if (braceCount === 0) {
                elseEnd = j;
                break;
              }
              j++;
            }
          } else {
            // Single line else on next line
            elseStart = elseLineIndex + 1;
            elseEnd = elseLineIndex + 2;
          }
        } else if (elseLine.startsWith('else ')) {
          // Inline else statement (e.g., "else printf(...);")
          const elseStatement = elseLine.substring(5).trim(); // Remove "else "
          const match = elseStatement.match(/printf\("([^"]*)"\)/);
          if (match) {
            const output = match[1].replace(/\\n/g, '\n');
            outputLog.push(`[PID ${process.pid}]: ${output}`);
          }
          i = elseLineIndex; // Will be incremented by loop
          // Child executes if block first
          executeCode(lines, childProcess, ifStart, ifEnd, true);
          continue; // Skip the rest
        } else if (elseLine.startsWith('else {')) {
          // "else {" on same line
          elseStart = elseLineIndex + 1;
          braceCount = 1;
          let j = elseLineIndex + 1;
          
          while (j < lines.length && braceCount > 0) {
            const l = lines[j].trim();
            if (l.includes('{')) braceCount++;
            if (l.includes('}')) braceCount--;
            if (braceCount === 0) {
              elseEnd = j;
              break;
            }
            j++;
          }
        }
      }
      
      // Child executes the if block
      executeCode(lines, childProcess, ifStart, ifEnd, true);
      
      // Parent executes the else block (if exists) or continues after
      if (elseStart !== -1 && elseEnd !== -1) {
        executeCode(lines, process, elseStart, elseEnd, false);
        i = elseEnd; // Skip past the else block (loop will increment)
      } else {
        i = ifEnd; // Skip past the if block (loop will increment)
      }
    }
    else if (line.includes('fork()')) {
      // Simple fork() without if condition
      const childProcess = createProcess(process.pid, process.depth + 1);
      process.children.push(childProcess);
      
      // Both parent and child continue from next line
      executeCode(lines, childProcess, i + 1, endLine, true);
      // Parent continues normally (no skip needed)
    }
  }
};


export const parseAndRunFork = (code: string): { rootProcess: ForkProcess; output: string[] } => {
  nextPid = 1;
  outputLog.length = 0;
  
  const rootProcess = createProcess(0, 0); // PID 1, PPID 0
  
  const lines = code.split('\n').filter(line => line.trim() !== '');

  executeCode(lines, rootProcess, 0, lines.length, false);

  return { rootProcess, output: [...outputLog] };
};
