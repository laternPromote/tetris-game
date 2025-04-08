// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    '#000000', // 背景色（黑色）
    '#FF0D72', // 品红
    '#0DC2FF', // 青色
    '#0DFF72', // 绿色
    '#F538FF', // 紫色
    '#FF8E0D', // 橙色
    '#FFE138', // 黄色
    '#3877FF'  // 蓝色
];

// 方块形状定义
const SHAPES = [
    [], // 空数组，因为我们从索引1开始使用
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],                         // J
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],                         // L
    [[1, 1], [1, 1]],                                           // O
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],                         // S
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],                         // T
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]]                          // Z
];

// 游戏状态
let canvas, ctx;
let canvasNext, ctxNext;
let requestId = null;
let gameOver = false;

// 游戏数据
let board = [];
let score = 0;
let level = 1;
let lines = 0;

// 当前和下一个方块
let piece;
let nextPiece;

// 游戏速度
let dropInterval = 1000; // 初始下落速度（毫秒）
let dropStart;
let paused = false;

// 触摸控制变量
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchThreshold = 30; // 触摸滑动阈值

// DOM元素
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const rotateBtn = document.getElementById('rotateBtn');
const downBtn = document.getElementById('downBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    // 设置主游戏画布
    canvas = document.getElementById('tetris');
    ctx = canvas.getContext('2d');
    
    // 设置下一个方块预览画布
    canvasNext = document.getElementById('nextPiece');
    ctxNext = canvasNext.getContext('2d');
    
    // 初始化游戏板
    initBoard();
    
    // 添加事件监听器
    document.addEventListener('keydown', handleKeyPress);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // 按钮事件
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', startGame);
    
    // 移动控制按钮
    leftBtn.addEventListener('click', () => movePiece(-1, 0));
    rightBtn.addEventListener('click', () => movePiece(1, 0));
    rotateBtn.addEventListener('click', rotatePiece);
    downBtn.addEventListener('click', () => movePiece(0, 1));
    
    // 绘制初始界面
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctxNext.fillStyle = '#000';
    ctxNext.fillRect(0, 0, canvasNext.width, canvasNext.height);
    
    // 绘制游戏说明
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('点击开始游戏', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '14px Arial';
    ctx.fillText('滑动控制:', canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('← → 移动', canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText('↑ 旋转', canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText('↓ 加速下落', canvas.width / 2, canvas.height / 2 + 70);
});

// 初始化游戏板
function initBoard() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

// 开始游戏
function startGame() {
    // 如果游戏已暂停，则继续游戏而不是重新开始
    if (paused && !gameOver) {
        togglePause();
        return;
    }
    
    // 重置游戏状态
    gameOver = false;
    gameOverScreen.classList.add('hidden');
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    updateScore();
    
    // 生成方块
    piece = randomPiece();
    nextPiece = randomPiece();
    drawNextPiece();
    
    // 如果已经有动画帧，取消它
    if (requestId) {
        cancelAnimationFrame(requestId);
    }
    
    // 开始游戏循环
    dropStart = Date.now();
    paused = false;
    pauseBtn.textContent = '暂停'; // 确保按钮文本正确
    update();
}

// 暂停/继续游戏
function togglePause() {
    if (gameOver) return;
    
    paused = !paused;
    // 修复按钮文本显示逻辑，确保与当前游戏状态一致
    if (paused) {
        pauseBtn.textContent = '继续';
    } else {
        pauseBtn.textContent = '暂停';
        dropStart = Date.now();
        update();
    }
}

// 游戏主循环
function update() {
    if (gameOver || paused) return;
    
    const now = Date.now();
    const delta = now - dropStart;
    
    if (delta > dropInterval) {
        movePiece(0, 1);
        dropStart = now;
    }
    
    draw();
    requestId = requestAnimationFrame(update);
}

// 绘制游戏状态
function draw() {
    // 清除画布
    ctx.fillStyle = COLORS[0];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制游戏板
    drawBoard();
    
    // 绘制当前方块
    drawPiece(ctx, piece);
}

// 绘制游戏板
function drawBoard() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
}

// 绘制方块
function drawPiece(context, p) {
    const shape = SHAPES[p.shape];
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(context, p.x + x, p.y + y, p.shape);
            }
        }
    }
}

// 绘制单个方块
function drawBlock(context, x, y, colorIndex) {
    // 主色填充
    context.fillStyle = COLORS[colorIndex];
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // 亮边（3D效果）
    context.fillStyle = lightenColor(COLORS[colorIndex], 30);
    context.fillRect(
        x * BLOCK_SIZE, 
        y * BLOCK_SIZE, 
        BLOCK_SIZE, 
        BLOCK_SIZE / 10
    );
    context.fillRect(
        x * BLOCK_SIZE, 
        y * BLOCK_SIZE, 
        BLOCK_SIZE / 10, 
        BLOCK_SIZE
    );
    
    // 暗边（3D效果）
    context.fillStyle = darkenColor(COLORS[colorIndex], 30);
    context.fillRect(
        x * BLOCK_SIZE, 
        y * BLOCK_SIZE + BLOCK_SIZE - BLOCK_SIZE / 10, 
        BLOCK_SIZE, 
        BLOCK_SIZE / 10
    );
    context.fillRect(
        x * BLOCK_SIZE + BLOCK_SIZE - BLOCK_SIZE / 10, 
        y * BLOCK_SIZE, 
        BLOCK_SIZE / 10, 
        BLOCK_SIZE
    );
    
    // 边框
    context.strokeStyle = darkenColor(COLORS[colorIndex], 50);
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// 绘制下一个方块
function drawNextPiece() {
    // 清除预览画布
    ctxNext.fillStyle = COLORS[0];
    ctxNext.fillRect(0, 0, canvasNext.width, canvasNext.height);
    
    // 计算居中位置
    const shape = SHAPES[nextPiece.shape];
    const offsetX = (canvasNext.width / BLOCK_SIZE - shape[0].length) / 2;
    const offsetY = (canvasNext.height / BLOCK_SIZE - shape.length) / 2;
    
    // 绘制下一个方块
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(
                    ctxNext, 
                    offsetX + x, 
                    offsetY + y, 
                    nextPiece.shape
                );
            }
        }
    }
}

// 生成随机方块
function randomPiece() {
    const shape = Math.floor(Math.random() * 7) + 1; // 1-7
    return {
        shape: shape,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[shape][0].length / 2),
        y: 0
    };
}

// 移动方块
function movePiece(dx, dy) {
    if (gameOver || paused) return false;
    
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    if (isValid(newX, newY, piece.shape)) {
        piece.x = newX;
        piece.y = newY;
        return true;
    }
    
    // 如果是向下移动且无法移动，则固定方块
    if (dy > 0) {
        lockPiece();
        removeFullRows();
        
        // 生成新方块
        piece = nextPiece;
        nextPiece = randomPiece();
        drawNextPiece();
        
        // 检查游戏是否结束
        if (!isValid(piece.x, piece.y, piece.shape)) {
            gameOver = true;
            showGameOver();
        }
    }
    
    return false;
}

// 旋转方块
function rotatePiece() {
    if (gameOver || paused) return;
    
    const shape = piece.shape;
    const oldMatrix = SHAPES[shape];
    const newMatrix = rotateMatrix(oldMatrix);
    
    // 保存原始形状
    const originalShape = SHAPES[shape];
    
    // 临时替换形状矩阵
    SHAPES[shape] = newMatrix;
    
    // 检查旋转后的位置是否有效
    if (isValid(piece.x, piece.y, shape)) {
        // 有效，保持新的旋转
    } else if (isValid(piece.x + 1, piece.y, shape)) {
        // 尝试右移一格
        piece.x += 1;
    } else if (isValid(piece.x - 1, piece.y, shape)) {
        // 尝试左移一格
        piece.x -= 1;
    } else if (isValid(piece.x, piece.y - 1, shape)) {
        // 尝试上移一格（针对I形方块）
        piece.y -= 1;
    } else {
        // 所有尝试都失败，恢复原始形状
        SHAPES[shape] = originalShape;
        return;
    }
}

// 旋转矩阵（顺时针90度）
function rotateMatrix(matrix) {
    const N = matrix.length;
    const result = Array.from({length: N}, () => Array(N).fill(0));
    
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            result[j][N - 1 - i] = matrix[i][j];
        }
    }
    
    return result;
}

// 检查位置是否有效
function isValid(x, y, shape) {
    const matrix = SHAPES[shape];
    
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col]) {
                const newX = x + col;
                const newY = y + row;
                
                // 检查边界
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;
                }
                
                // 检查与已有方块的碰撞
                if (newY >= 0 && board[newY][newX]) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

// 固定方块到游戏板
function lockPiece() {
    const shape = SHAPES[piece.shape];
    
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardY = piece.y + y;
                if (boardY < 0) continue; // 超出顶部的部分不计入
                
                board[boardY][piece.x + x] = piece.shape;
            }
        }
    }
}

// 消除已满的行
function removeFullRows() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            // 移除该行
            board.splice(y, 1);
            // 在顶部添加新行
            board.unshift(Array(COLS).fill(0));
            // 因为删除了一行，所以y需要加1以检查同一位置的新行
            y++;
            linesCleared++;
        }
    }
    
    if (linesCleared > 0) {
        // 更新分数
        updateScore(linesCleared);
    }
}

// 更新分数
function updateScore(linesCleared = 0) {
    if (linesCleared > 0) {
        // 根据消除的行数计算得分
        // 1行=100, 2行=300, 3行=500, 4行=800
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        
        // 更新行数
        lines += linesCleared;
        
        // 每清除10行升一级
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            // 提高游戏速度
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }
    }
    
    // 更新显示
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// 显示游戏结束界面
function showGameOver() {
    cancelAnimationFrame(requestId);
    requestId = null;
    
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// 键盘控制
function handleKeyPress(event) {
    if (gameOver) return;
    
    switch(event.keyCode) {
        case 37: // 左箭头
            movePiece(-1, 0);
            break;
        case 39: // 右箭头
            movePiece(1, 0);
            break;
        case 40: // 下箭头
            movePiece(0, 1);
            break;
        case 38: // 上箭头
            rotatePiece();
            break;
        case 32: // 空格键（硬降）
            hardDrop();
            break;
        case 80: // P键（暂停）
            togglePause();
            break;
    }
}

// 硬降（立即下落到底部）
function hardDrop() {
    if (gameOver || paused) return;
    
    while (movePiece(0, 1)) {
        // 持续下落直到不能再下落
    }
}

// 触摸控制
function handleTouchStart(event) {
    if (gameOver) return;
    
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    event.preventDefault(); // 防止滚动
}

function handleTouchMove(event) {
    if (gameOver) return;
    event.preventDefault(); // 防止滚动
}

function handleTouchEnd(event) {
    if (gameOver || paused) return;
    
    touchEndX = event.changedTouches[0].clientX;
    touchEndY = event.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    
    // 判断滑动方向
    if (Math.max(absDiffX, absDiffY) > touchThreshold) {
        if (absDiffX > absDiffY) {
            // 水平滑动
            if (diffX > 0) {
                movePiece(1, 0); // 右移
            } else {
                movePiece(-1, 0); // 左移
            }
        } else {
            // 垂直滑动
            if (diffY > 0) {
                movePiece(0, 1); // 下移
            } else {
                rotatePiece(); // 上滑旋转
            }
        }
    } else {
        // 轻触（视为旋转）
        rotatePiece();
    }
    
    event.preventDefault();
}

// 颜色处理函数
function lightenColor(color, percent) {
    return adjustColor(color, percent);
}

function darkenColor(color, percent) {
    return adjustColor(color, -percent);
}

function adjustColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}