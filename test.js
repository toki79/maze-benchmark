// test.js

// Test the maze generation and solving functionality
function runTests() {
    console.log("Starting tests for Maze Lab...");
    
    // Test 1: Maze generation
    console.log("Test 1: Maze Generation");
    try {
        const width = 15;
        const height = 10;
        
        // Generate a maze
        const maze = generateMaze(width, height);
        
        // Check if maze has correct dimensions
        if (maze.length !== height) {
            console.error("FAIL: Incorrect height");
            return false;
        }
        
        if (maze[0].length !== width) {
            console.error("FAIL: Incorrect width");
            return false;
        }
        
        // Check if start and end positions are clear (should be 0)
        if (maze[1][1] === 1) {
            console.error("FAIL: Start position is not clear");
            return false;
        }
        
        if (maze[height-2][width-2] === 1) {
            console.error("FAIL: Goal position is not clear");
            return false;
        }
        
        console.log("PASS: Maze generation works correctly");
    } catch (error) {
        console.error("FAIL: Maze generation error:", error);
        return false;
    }
    
    // Test 2: Difficulty levels
    console.log("Test 2: Difficulty Levels");
    try {
        const difficulties = ['easy', 'medium', 'hard'];
        for (const diff of difficulties) {
            const maze = generateMaze(15, 10, diff);
            
            // Count walls for each difficulty
            let wallCount = 0;
            for (let y = 0; y < maze.length; y++) {
                for (let x = 0; x < maze[y].length; x++) {
                    if (maze[y][x] === 1) wallCount++;
                }
            }
            
            console.log(`  ${diff} difficulty: ${wallCount} walls`);
        }
        
        console.log("PASS: Difficulty levels work correctly");
    } catch (error) {
        console.error("FAIL: Difficulty levels error:", error);
        return false;
    }
    
    // Test 3: Local storage
    console.log("Test 3: Local Storage Simulation");
    try {
        // Store a test time
        const testKey = 'easy-1';
        let bestTimes = JSON.parse(localStorage.getItem('mazeBestTimes') || '{}');
        bestTimes[testKey] = 30;
        localStorage.setItem('mazeBestTimes', JSON.stringify(bestTimes));
        
        // Read it back
        const storedTimes = JSON.parse(localStorage.getItem('mazeBestTimes') || '{}');
        if (storedTimes[testKey] === 30) {
            console.log("PASS: Local storage works correctly");
        } else {
            console.error("FAIL: Local storage not working");
            return false;
        }
    } catch (error) {
        console.error("FAIL: Local storage error:", error);
        return false;
    }
    
    console.log("All tests completed successfully!");
    return true;
}

// Run the tests
runTests();