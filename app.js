// app.js

// Simple maze generator function for testing purposes
function generateMaze(width, height, difficulty = 'easy') {
    // Create a simple maze with walls
    const maze = [];
    
    // Initialize with walls
    for (let y = 0; y < height; y++) {
        maze[y] = [];
        for (let x = 0; x < width; x++) {
            // Border walls
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                maze[y][x] = 1; // Wall
            } else {
                // Random walls for difficulty levels
                let wallChance = 0.2;
                if (difficulty === 'medium') wallChance = 0.3;
                if (difficulty === 'hard') wallChance = 0.4;
                
                maze[y][x] = Math.random() < wallChance ? 1 : 0; // 1 = wall, 0 = path
            }
        }
    }
    
    // Ensure a path from start to goal
    createPath(maze, width, height);
    
    return maze;
}

function createPath(maze, width, height) {
    // Simple path creation algorithm
    const startX = 1;
    const startY = 1;
    const endX = width - 2;
    const endY = height - 2;
    
    // Clear a simple path from start to end
    let currentX = startX;
    let currentY = startY;
    
    maze[currentY][currentX] = 0; // Start position
    
    // Create a basic path
    while (currentX < endX || currentY < endY) {
        if (currentX < endX && Math.random() > 0.5) {
            currentX++;
            maze[currentY][currentX] = 0;
        } else if (currentY < endY) {
            currentY++;
            maze[currentY][currentX] = 0;
        }
    }
    
    // Mark goal position
    maze[endY][endX] = 0;
}

class MazeGame {
    constructor() {
        this.canvas = document.getElementById('mazeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.player = { x: 0, y: 0 };
        this.goal = { x: 0, y: 0 };
        this.maze = [];
        this.level = 1;
        this.difficulty = 'easy';
        this.startTime = 0;
        this.currentTime = 0;
        this.gameRunning = false;
        this.timer = null;
        this.bestTimes = JSON.parse(localStorage.getItem('mazeBestTimes') || '{}');
        
        // Initialize the game
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startNewGame();
        this.drawMaze();
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Button controls
        document.getElementById('start-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartLevel());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.startNewGame();
        });
        
        // Touch controls for mobile
        this.setupTouchControls();
    }
    
    setupTouchControls() {
        // Simple touch controls for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Determine swipe direction
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal swipe
                if (diffX > 0) {
                    this.movePlayer(1, 0); // Right
                } else {
                    this.movePlayer(-1, 0); // Left
                }
            } else {
                // Vertical swipe
                if (diffY > 0) {
                    this.movePlayer(0, 1); // Down
                } else {
                    this.movePlayer(0, -1); // Up
                }
            }
            
            e.preventDefault();
        });
    }
    
    handleKeyPress(e) {
        let dx = 0;
        let dy = 0;
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                dy = -1;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                dy = 1;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                dx = -1;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                dx = 1;
                break;
            default:
                return;
        }
        
        e.preventDefault();
        if (this.gameRunning) {
            this.movePlayer(dx, dy);
        }
    }
    
    generateMaze(width, height) {
        return generateMaze(width, height, this.difficulty);
    }
    
    startNewGame() {
        this.level = 1;
        this.updateLevelDisplay();
        this.generateNewMaze();
        this.startTimer();
        this.gameRunning = true;
        this.drawMaze();
    }
    
    restartLevel() {
        this.generateNewMaze();
        this.startTimer();
        this.gameRunning = true;
        this.drawMaze();
    }
    
    generateNewMaze() {
        // Adjust maze size based on difficulty
        let width, height;
        switch(this.difficulty) {
            case 'easy':
                width = 15;
                height = 10;
                break;
            case 'medium':
                width = 20;
                height = 15;
                break;
            case 'hard':
                width = 25;
                height = 20;
                break;
            default:
                width = 15;
                height = 10;
        }
        
        // Generate the maze
        this.maze = this.generateMaze(width, height);
        
        // Set player and goal positions
        this.player = { x: 1, y: 1 };
        this.goal = { 
            x: this.maze[0].length - 2, 
            y: this.maze.length - 2 
        };
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.currentTime = 0;
        
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.timer = setInterval(() => {
            this.currentTime = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('time').textContent = this.currentTime;
        }, 1000);
    }
    
    movePlayer(dx, dy) {
        if (!this.gameRunning) return;
        
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        // Check if the new position is valid (not a wall and within bounds)
        if (newX >= 0 && newX < this.maze[0].length && 
            newY >= 0 && newY < this.maze.length &&
            this.maze[newY][newX] === 0) {
            
            this.player.x = newX;
            this.player.y = newY;
            
            this.drawMaze();
            
            // Check if player reached the goal
            if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
                this.completeLevel();
            }
        }
    }
    
    completeLevel() {
        this.gameRunning = false;
        clearInterval(this.timer);
        
        // Update best time
        const key = `${this.difficulty}-${this.level}`;
        if (!this.bestTimes[key] || this.currentTime < this.bestTimes[key]) {
            this.bestTimes[key] = this.currentTime;
            localStorage.setItem('mazeBestTimes', JSON.stringify(this.bestTimes));
        }
        
        // Show win screen
        document.getElementById('win-time').textContent = this.currentTime;
        document.getElementById('win-best-time').textContent = 
            this.bestTimes[key] ? this.bestTimes[key] : '-';
        document.getElementById('win-screen').style.display = 'block';
    }
    
    nextLevel() {
        this.level++;
        this.updateLevelDisplay();
        this.generateNewMaze();
        this.startTimer();
        this.gameRunning = true;
        this.drawMaze();
        document.getElementById('win-screen').style.display = 'none';
    }
    
    updateLevelDisplay() {
        document.getElementById('level').textContent = this.level;
        const bestTimeKey = `${this.difficulty}-${this.level}`;
        document.getElementById('best-time').textContent = 
            this.bestTimes[bestTimeKey] ? this.bestTimes[bestTimeKey] : '-';
    }
    
    drawMaze() {
        const cellWidth = this.width / this.maze[0].length;
        const cellHeight = this.height / this.maze.length;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw maze cells
        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                const cellX = x * cellWidth;
                const cellY = y * cellHeight;
                
                if (this.maze[y][x] === 1) {
                    // Wall
                    this.ctx.fillStyle = '#2d3436';
                    this.ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
                    
                    // Wall details
                    this.ctx.strokeStyle = '#74b9ff';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
                } else {
                    // Path
                    this.ctx.fillStyle = '#0d1b2a';
                    this.ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
                }
                
                // Draw grid lines for better visibility
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
            }
        }
        
        // Draw start position (green)
        const startX = this.player.x * cellWidth;
        const startY = this.player.y * cellHeight;
        this.ctx.fillStyle = '#00b894';
        this.ctx.beginPath();
        this.ctx.arc(startX + cellWidth/2, startY + cellHeight/2, Math.min(cellWidth, cellHeight)/3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw goal position (red)
        const goalX = this.goal.x * cellWidth;
        const goalY = this.goal.y * cellHeight;
        this.ctx.fillStyle = '#ff7675';
        this.ctx.beginPath();
        this.ctx.arc(goalX + cellWidth/2, goalY + cellHeight/2, Math.min(cellWidth, cellHeight)/3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw goal border
        this.ctx.strokeStyle = '#ff7675';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(goalX + cellWidth/2, goalY + cellHeight/2, Math.min(cellWidth, cellHeight)/3, 0, Math.PI * 2);
        this.ctx.stroke();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MazeGame();
});