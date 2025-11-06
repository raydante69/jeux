import * as THREE from 'three';

// Configuration du jeu
const config = {
    playerSpeed: 0.1,
    jumpForce: 0.3,
    gravity: 0.015,
    mouseSensitivity: 0.002,
    playerHeight: 1.8,
    playerRadius: 0.5,
};

// Variables globales
let scene, camera, renderer;
let player = {
    position: new THREE.Vector3(0, config.playerHeight, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    health: 100,
    isJumping: false,
};

let controls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
};

let mouse = {
    x: 0,
    y: 0,
};

let gameStarted = false;
let pointerLocked = false;
let monsters = [];
let bullets = [];
let score = 0;
let monstersKilled = 0;

// Système d'armes
const weapons = {
    pistol: {
        name: 'PISTOLET',
        damage: 25,
        fireRate: 300,
        ammo: 30,
        maxAmmo: 90,
        clipSize: 30,
        reloadTime: 1500,
        spread: 0.02,
    },
    rifle: {
        name: 'FUSIL D\'ASSAUT',
        damage: 35,
        fireRate: 150,
        ammo: 40,
        maxAmmo: 120,
        clipSize: 40,
        reloadTime: 2000,
        spread: 0.015,
    },
    sniper: {
        name: 'SNIPER',
        damage: 100,
        fireRate: 1000,
        ammo: 10,
        maxAmmo: 30,
        clipSize: 10,
        reloadTime: 3000,
        spread: 0.001,
    },
};

let currentWeapon = 'pistol';
let canShoot = true;
let isReloading = false;

// Initialisation
function init() {
    // Scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

    // Caméra
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.copy(player.position);

    // Renderer
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Sol
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a7c59,
        roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Obstacles (murs)
    createWalls();

    // Événements
    setupEventListeners();

    // UI
    updateUI();
}

function createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.7,
    });

    const walls = [
        { x: 0, z: -30, width: 60, height: 5, depth: 2 },
        { x: 0, z: 30, width: 60, height: 5, depth: 2 },
        { x: -30, z: 0, width: 2, height: 5, depth: 60 },
        { x: 30, z: 0, width: 2, height: 5, depth: 60 },
    ];

    walls.forEach(wall => {
        const geometry = new THREE.BoxGeometry(wall.width, wall.height, wall.depth);
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        mesh.position.set(wall.x, wall.height / 2, wall.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    });

    // Quelques obstacles dans l'arène
    for (let i = 0; i < 10; i++) {
        const size = Math.random() * 2 + 1;
        const geometry = new THREE.BoxGeometry(size, size * 2, size);
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        mesh.position.set(
            (Math.random() - 0.5) * 40,
            size,
            (Math.random() - 0.5) * 40
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }
}

function setupEventListeners() {
    // Clavier
    document.addEventListener('keydown', (e) => {
        if (!gameStarted) return;

        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                controls.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                controls.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                controls.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                controls.right = true;
                break;
            case 'Space':
                controls.jump = true;
                break;
            case 'KeyR':
                reload();
                break;
            case 'Digit1':
                switchWeapon('pistol');
                break;
            case 'Digit2':
                switchWeapon('rifle');
                break;
            case 'Digit3':
                switchWeapon('sniper');
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                controls.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                controls.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                controls.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                controls.right = false;
                break;
            case 'Space':
                controls.jump = false;
                break;
        }
    });

    // Souris
    document.addEventListener('mousemove', (e) => {
        if (!pointerLocked) return;

        player.rotation.y -= e.movementX * config.mouseSensitivity;
        player.rotation.x -= e.movementY * config.mouseSensitivity;
        player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rotation.x));
    });

    document.addEventListener('click', () => {
        if (!gameStarted) return;
        if (!pointerLocked) {
            document.body.requestPointerLock();
        }
        shoot();
    });

    document.addEventListener('pointerlockchange', () => {
        pointerLocked = document.pointerLockElement === document.body;
    });

    // Boutons
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);

    // Redimensionnement
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function startGame() {
    gameStarted = true;
    document.getElementById('instructions').classList.add('hidden');
    document.body.requestPointerLock();
    spawnMonster();
    // Spawn des monstres périodiquement
    setInterval(() => {
        if (gameStarted && monsters.length < 10) {
            spawnMonster();
        }
    }, 3000);
    animate();
}

function restartGame() {
    // Réinitialiser toutes les variables
    player.health = 100;
    player.position.set(0, config.playerHeight, 0);
    player.velocity.set(0, 0, 0);
    score = 0;
    monstersKilled = 0;
    currentWeapon = 'pistol';

    // Réinitialiser les munitions
    Object.keys(weapons).forEach(key => {
        const weapon = weapons[key];
        weapon.ammo = weapon.clipSize;
    });

    // Supprimer tous les monstres
    monsters.forEach(monster => {
        scene.remove(monster.mesh);
    });
    monsters = [];

    // Supprimer toutes les balles
    bullets.forEach(bullet => {
        scene.remove(bullet.mesh);
    });
    bullets = [];

    // Masquer l'écran de game over
    document.getElementById('game-over').classList.add('hidden');

    // Redémarrer le jeu
    gameStarted = true;
    updateUI();
    document.body.requestPointerLock();
}

function createMonster(position) {
    // Corps du monstre (forme humanoïde)
    const group = new THREE.Group();

    // Couleurs aléatoires pour varier les monstres
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Corps
    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);

    // Tête
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: color });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.6;
    head.castShadow = true;
    group.add(head);

    // Yeux (rouges et effrayants)
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 2.7, 0.35);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 2.7, 0.35);
    group.add(rightEye);

    // Bras
    const armGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-0.65, 1.5, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0.65, 1.5, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Jambes
    const legGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.3, 0.5, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.3, 0.5, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    group.position.copy(position);
    scene.add(group);

    return {
        mesh: group,
        health: 100,
        speed: 0.02 + Math.random() * 0.02,
        damage: 10,
        attackCooldown: 0,
        animation: {
            time: 0,
            limbSwing: 0,
        },
    };
}

function spawnMonster() {
    // Position aléatoire autour du joueur (mais pas trop près)
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 20;
    const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
    );

    const monster = createMonster(position);
    monsters.push(monster);
}

function updateMonsters(deltaTime) {
    monsters.forEach((monster, index) => {
        // Animation
        monster.animation.time += deltaTime;
        monster.animation.limbSwing = Math.sin(monster.animation.time * 0.01) * 0.3;

        // Animer les bras et jambes
        if (monster.mesh.children.length >= 7) {
            const leftArm = monster.mesh.children[3];
            const rightArm = monster.mesh.children[4];
            const leftLeg = monster.mesh.children[5];
            const rightLeg = monster.mesh.children[6];

            leftArm.rotation.x = monster.animation.limbSwing;
            rightArm.rotation.x = -monster.animation.limbSwing;
            leftLeg.rotation.x = -monster.animation.limbSwing;
            rightLeg.rotation.x = monster.animation.limbSwing;
        }

        // IA - Se déplacer vers le joueur
        const direction = new THREE.Vector3()
            .subVectors(player.position, monster.mesh.position)
            .normalize();

        monster.mesh.position.add(direction.multiplyScalar(monster.speed));
        monster.mesh.lookAt(player.position);

        // Attaquer le joueur si proche
        const distanceToPlayer = monster.mesh.position.distanceTo(player.position);
        if (distanceToPlayer < 2 && monster.attackCooldown <= 0) {
            player.health -= monster.damage;
            monster.attackCooldown = 1000;
            updateUI();

            if (player.health <= 0) {
                gameOver();
            }
        }

        if (monster.attackCooldown > 0) {
            monster.attackCooldown -= deltaTime;
        }

        // Supprimer si mort
        if (monster.health <= 0) {
            scene.remove(monster.mesh);
            monsters.splice(index, 1);
            score += 100;
            monstersKilled++;
            updateUI();
        }
    });
}

function shoot() {
    if (!canShoot || isReloading) return;

    const weapon = weapons[currentWeapon];

    if (weapon.ammo <= 0) {
        // Auto-reload si plus de munitions
        reload();
        return;
    }

    weapon.ammo--;
    canShoot = false;
    updateUI();

    // Créer une balle
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Position de départ (devant la caméra)
    const startPosition = camera.position.clone();
    bulletMesh.position.copy(startPosition);

    // Direction avec spread (imprécision)
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);

    // Ajouter du spread
    direction.x += (Math.random() - 0.5) * weapon.spread;
    direction.y += (Math.random() - 0.5) * weapon.spread;
    direction.normalize();

    scene.add(bulletMesh);

    bullets.push({
        mesh: bulletMesh,
        velocity: direction.multiplyScalar(2),
        damage: weapon.damage,
        lifetime: 2000,
    });

    // Cooldown de tir
    setTimeout(() => {
        canShoot = true;
    }, weapon.fireRate);
}

function reload() {
    if (isReloading) return;

    const weapon = weapons[currentWeapon];

    if (weapon.ammo >= weapon.clipSize) return;

    const neededAmmo = weapon.clipSize - weapon.ammo;
    const availableAmmo = weapon.maxAmmo - weapon.ammo;

    if (availableAmmo <= 0) return;

    isReloading = true;

    setTimeout(() => {
        const ammoToReload = Math.min(neededAmmo, availableAmmo);
        weapon.ammo += ammoToReload;
        isReloading = false;
        updateUI();
    }, weapon.reloadTime);
}

function switchWeapon(weaponName) {
    if (isReloading) return;
    currentWeapon = weaponName;
    updateUI();
}

function updateBullets(deltaTime) {
    bullets.forEach((bullet, index) => {
        bullet.mesh.position.add(bullet.velocity);
        bullet.lifetime -= deltaTime;

        // Vérifier collision avec monstres
        monsters.forEach((monster) => {
            const distance = bullet.mesh.position.distanceTo(monster.mesh.position);
            if (distance < 1) {
                monster.health -= bullet.damage;
                scene.remove(bullet.mesh);
                bullets.splice(index, 1);
            }
        });

        // Supprimer si trop vieille
        if (bullet.lifetime <= 0) {
            scene.remove(bullet.mesh);
            bullets.splice(index, 1);
        }
    });
}

function updatePlayer(deltaTime) {
    // Mouvement
    const moveDirection = new THREE.Vector3();

    if (controls.forward) moveDirection.z -= 1;
    if (controls.backward) moveDirection.z += 1;
    if (controls.left) moveDirection.x -= 1;
    if (controls.right) moveDirection.x += 1;

    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
        player.position.x += moveDirection.x * config.playerSpeed;
        player.position.z += moveDirection.z * config.playerSpeed;
    }

    // Saut
    if (controls.jump && !player.isJumping) {
        player.velocity.y = config.jumpForce;
        player.isJumping = true;
    }

    // Gravité
    player.velocity.y -= config.gravity;
    player.position.y += player.velocity.y;

    // Sol
    if (player.position.y <= config.playerHeight) {
        player.position.y = config.playerHeight;
        player.velocity.y = 0;
        player.isJumping = false;
    }

    // Limites de la carte
    const mapSize = 29;
    player.position.x = Math.max(-mapSize, Math.min(mapSize, player.position.x));
    player.position.z = Math.max(-mapSize, Math.min(mapSize, player.position.z));

    // Mettre à jour la caméra
    camera.position.copy(player.position);
    camera.rotation.set(player.rotation.x, player.rotation.y, 0);
}

function updateUI() {
    const weapon = weapons[currentWeapon];

    document.getElementById('health-fill').style.width = player.health + '%';
    document.getElementById('ammo-count').textContent = `${weapon.ammo}/${weapon.maxAmmo - weapon.ammo}`;
    document.getElementById('weapon-name').textContent = weapon.name;
    document.getElementById('score-count').textContent = score;
}

function gameOver() {
    gameStarted = false;
    document.exitPointerLock();
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;
    document.getElementById('monsters-killed').textContent = monstersKilled;
}

// Boucle d'animation
let lastTime = Date.now();

function animate() {
    if (!gameStarted) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    updatePlayer(deltaTime);
    updateMonsters(deltaTime);
    updateBullets(deltaTime);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Démarrer
init();
