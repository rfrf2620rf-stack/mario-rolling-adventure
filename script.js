// Basic Game Setup
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Body = Matter.Body;

let engine, render, runner;
let player, goal;
const obstacles = [];
const traps = [];

// Window dimensions
let width = window.innerWidth;
let height = window.innerHeight;

// Game State
let currentLevel = 1;
let isPlaying = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gameUI = document.getElementById('game-ui');
const levelDisplay = document.getElementById('level-display');

// Colors
const COLOR_PLAYER = '#E60012'; // Red
const COLOR_GOAL = '#00AA00';   // Green
const COLOR_WALL = '#8B4513';   // Brown (Brick)
const COLOR_TRAP = '#000000';   // Black

// Initialize Matter.js
function initGame() {
    engine = Engine.create();
    engine.world.gravity.y = 0; // Controlled by gyro

    render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent' // Use CSS background
        }
    });

    // Create Walls
    const wallThickness = 50;
    const walls = [
        Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, render: { fillStyle: COLOR_WALL } }), // Top
        Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, render: { fillStyle: COLOR_WALL } }), // Bottom
        Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { fillStyle: COLOR_WALL } }), // Right
        Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { fillStyle: COLOR_WALL } })  // Left
    ];
    Composite.add(engine.world, walls);

    // Collision Event
    Events.on(engine, 'collisionStart', function (event) {
        const pairs = event.pairs;

        for (let i = 0; i < pairs.length; i++) {
            const bodyA = pairs[i].bodyA;
            const bodyB = pairs[i].bodyB;

            // Check for Goal (Sensor)
            if ((bodyA === player && bodyB.label === 'goal') || (bodyB === player && bodyA.label === 'goal')) {
                winLevel();
            }

            // Check for Trap (Sensor)
            if ((bodyA === player && bodyB.label === 'trap') || (bodyB === player && bodyA.label === 'trap')) {
                failLevel();
            }
        }
    });


    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    loadLevel(currentLevel);
}

// Level Setup
function loadLevel(level) {
    // Clear previous dynamic bodies
    if (player) Composite.remove(engine.world, player);
    if (goal) Composite.remove(engine.world, goal);
    obstacles.forEach(b => Composite.remove(engine.world, b));
    traps.forEach(b => Composite.remove(engine.world, b));
    obstacles.length = 0;
    traps.length = 0;

    levelDisplay.textContent = `Level ${level}`;

    // Spawn Player (Start Position)
    player = Bodies.circle(100, 100, 20, {
        restitution: 0.5,
        friction: 0.05,
        render: {
            sprite: {
                texture: 'assets/chara_mario.png',
                xScale: 0.1, // Adjust scale as needed
                yScale: 0.1
            }
        }
    });
    Composite.add(engine.world, player);

    // Goal Position (changes slightly per level or fixed)
    goal = Bodies.rectangle(width - 100, height - 100, 60, 60, {
        isStatic: true,
        isSensor: true, // Trigger only
        label: 'goal',
        render: {
            sprite: {
                texture: 'assets/peach.png',
                xScale: 0.15,
                yScale: 0.15
            }
        }
    });
    Composite.add(engine.world, goal);

    // Add Obstacles & Traps based on Level
    setupLevelObstacles(level);
}

function setupLevelObstacles(level) {
    // Simple logic for demonstration
    // In real implementation, we might want coord based maps

    // Level 1: Just walls (already there), maybe 1-2 pegs
    if (level === 1) {
        addPeg(width / 2, height / 2);
    }
    // Level 2: More pegs, maybe a trap
    else if (level === 2) {
        addPeg(width / 3, height / 2);
        addPeg(width * 2 / 3, height / 2);
        addTrap(width / 2, height / 2);
    }
    // Level 3: Harder
    else if (level >= 3) {
        for (let i = 0; i < 5; i++) {
            addPeg(Math.random() * (width - 100) + 50, Math.random() * (height - 100) + 50);
        }
        addTrap(width / 2, height / 3);
        addTrap(width / 2, height * 2 / 3);
    }
}

function addPeg(x, y) {
    const peg = Bodies.circle(x, y, 10, {
        isStatic: true,
        render: { fillStyle: '#FFD700' } // Gold
    });
    Composite.add(engine.world, peg);
    obstacles.push(peg);
}

function addTrap(x, y) {
    const trap = Bodies.circle(x, y, 30, {
        isStatic: true,
        isSensor: true,
        label: 'trap',
        render: {
            sprite: {
                texture: 'assets/kuppa.png',
                xScale: 0.1,
                yScale: 0.1
            }
        }
    });
    Composite.add(engine.world, trap);
    traps.push(trap);
}

// Permission & Control
function requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    startLvl();
                } else {
                    alert('ジャイロセンサーをきょかしてね！');
                }
            })
            .catch(console.error);
    } else {
        // Non-iOS 13+ devices
        startLvl();
    }
}

function startLvl() {
    startScreen.style.display = 'none';
    gameUI.style.display = 'block';

    if (!engine) {
        initGame();
    } else {
        loadLevel(currentLevel);
    }

    window.addEventListener('deviceorientation', handleOrientation);
    isPlaying = true;
}

function handleOrientation(event) {
    if (!isPlaying) return;

    // Beta: Front-Back (-180 to 180)
    // Gamma: Left-Right (-90 to 90)
    const gravityScale = 0.002; // Reduced sensitivity for kids

    // Limit gravity max values
    let x = event.gamma * gravityScale; // x axis
    let y = event.beta * gravityScale;  // y axis

    // Clamp values to avoid extreme speeds
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));

    engine.world.gravity.x = x;
    engine.world.gravity.y = y;
}

// Collision Handling (Old placeholder removed)

// Logic hook for events
startBtn.addEventListener('click', requestPermission);
document.getElementById('restart-btn').addEventListener('click', () => loadLevel(currentLevel));



function winLevel() {
    if (!isPlaying) return;
    isPlaying = false; // Stop control

    // Fanfare effect (Simple visual pulse for now)
    player.render.fillStyle = '#FFFFFF'; // Flash white

    setTimeout(() => {
        alert('ゴール！！やったね！'); // Simple feedback for prototype
        currentLevel++;
        if (currentLevel > 3) {
            alert('ぜんぶ クリア！ おめでとう！');
            currentLevel = 1;
        }
        isPlaying = true;
        loadLevel(currentLevel);
    }, 500);
}

function failLevel() {
    if (!isPlaying) return;
    // Don't alert immediately, just respawn
    // Visual effect: disappear
    Composite.remove(engine.world, player);

    // Play "fail" sound (optional, skipping for now)
    // console.log("Oh no!");

    setTimeout(() => {
        // Respawn at start
        loadLevel(currentLevel); // Reload resets player
    }, 500);
}
