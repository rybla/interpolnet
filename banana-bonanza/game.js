// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Create a new Phaser game instance
const game = new Phaser.Game(config);

function preload() {
    // Load game assets
    this.load.image('monkey_thrower', 'assets/monkey_thrower.png');
    this.load.image('monkey_target', 'assets/monkey_target.png');
    this.load.image('banana', 'assets/banana.png');
    this.load.image('background', 'assets/background.png');
    this.load.image('ground', 'assets/ground.png');
}

function create() {
    // Add background
    this.add.image(400, 300, 'background');

    // Add ground
    const ground = this.physics.add.staticGroup();
    ground.create(400, 568, 'ground').setScale(2).refreshBody();

    // Add thrower monkey
    this.thrower = this.physics.add.sprite(100, 450, 'monkey_thrower');
    this.thrower.setCollideWorldBounds(true);

    // Add target monkeys
    this.targets = this.physics.add.group({
        key: 'monkey_target',
        repeat: 2,
        setXY: { x: 400, y: 450, stepX: 150 }
    });

    this.targets.children.iterate(function (child) {
        child.setCollideWorldBounds(true);
    });

    // Add banana group
    this.bananas = this.physics.add.group();

    // Set up collision
    this.physics.add.collider(this.thrower, ground);
    this.physics.add.collider(this.targets, ground);
    this.physics.add.collider(this.bananas, ground, (banana) => {
        banana.destroy();
    });
    this.physics.add.overlap(this.bananas, this.targets, hitTarget, null, this);

    // Input handling for throwing bananas
    this.input.on('pointerdown', (pointer) => {
        throwBanana.call(this, pointer.x, pointer.y);
    });

    // Add a single worldbounds event listener
    this.physics.world.on('worldbounds', (body) => {
        // Check if the object that hit the bounds is a banana
        if (this.bananas.contains(body.gameObject)) {
            body.gameObject.destroy();
        }
    });
}

function update() {
    // Game loop
}

function hitTarget(banana, target) {
    banana.destroy();
    target.destroy();

    if (this.targets.countActive(true) === 0) {
        // All targets are hit, you can add a win condition here
        this.add.text(400, 300, 'You Win!', { fontSize: '64px', fill: '#fff' }).setOrigin(0.5);
    }
}

function throwBanana(targetX, targetY) {
    const banana = this.bananas.create(this.thrower.x, this.thrower.y, 'banana');
    banana.setCollideWorldBounds(true);
    banana.body.onWorldBounds = true; // Enable worldbounds event for this object

    // Calculate the angle and velocity
    const angle = Phaser.Math.Angle.Between(this.thrower.x, this.thrower.y, targetX, targetY);
    const velocity = 600;
    this.physics.velocityFromRotation(angle, velocity, banana.body.velocity);
}
