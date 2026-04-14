const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let level = 1;
let aiReactionDelay = 500;
let aiDamageMultiplier = 1;

let timer = 60;
let timerId;
let gameFinished = false;
let isStarted = false;

// Configs dos personagens
const CHARACTERS = {
    'cyber': { color: '#00ff00', speed: 6, dmgBase: 1, manaRegen: 1 },
    'inferno': { color: '#ff0000', speed: 4, dmgBase: 1.5, manaRegen: 1 },
    'frost': { color: '#00d9ff', speed: 5, dmgBase: 1.2, manaRegen: 1.5 },
    'gold': { color: '#ffea00', speed: 5, dmgBase: 1.2, manaRegen: 1.2 }
};

let player = new Fighter({
    position: { x: 200, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#00ff00',
    offset: { x: 0, y: 0 }
});

let enemy = new Fighter({
    position: { x: 800, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#ff0000',
    offset: { x: -50, y: 0 }
});

const keys = {
    a: { pressed: false },
    d: { pressed: false },
    w: { pressed: false }
};

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    );
}

function decreaseTimer() {
    if (!isStarted) return;
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        document.getElementById('timer').innerText = timer;
    }

    if (timer === 0 && !gameFinished) {
        determineWinner({ player, enemy, timerId });
    }
}

// Lançado via onclick do HTML 
window.selectCharacter = function(charKey) {
    document.getElementById('char-select').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'flex';
    
    // Settando player
    const pData = CHARACTERS[charKey];
    player.color = pData.color;
    player.dmgMult = pData.dmgBase;
    player.speed = pData.speed;
    document.getElementById('p1-name').innerText = charKey.toUpperCase();

    // Sorteando Inimigo (IA)
    const keys = Object.keys(CHARACTERS);
    const aiKey = keys[Math.floor(Math.random() * keys.length)];
    const aiData = CHARACTERS[aiKey];
    enemy.color = aiData.color;
    enemy.dmgMult = aiData.dmgBase;
    enemy.speed = aiData.speed;
    document.getElementById('p2-name').innerText = "IA " + aiKey.toUpperCase();

    isStarted = true;
    decreaseTimer();
};

function determineWinner({ player, enemy, timerId }) {
    clearTimeout(timerId);
    gameFinished = true;
    const messageDisplay = document.getElementById('message-display');
    messageDisplay.style.display = 'block';

    if (player.health === enemy.health) {
        messageDisplay.innerHTML = 'Empate';
        setTimeout(resetLevel, 2000);
    } else if (player.health > enemy.health) {
        messageDisplay.innerHTML = 'Você Venceu!';
        setTimeout(nextLevel, 2000);
    } else if (player.health < enemy.health) {
        messageDisplay.innerHTML = 'IA Venceu';
        setTimeout(resetLevel, 2000);
    }
}

function nextLevel() {
    level++;
    aiReactionDelay = Math.max(100, 500 - (level - 1) * 100);
    aiDamageMultiplier = 1 + (level - 1) * 0.1;
    document.getElementById('level-number').innerText = level;
    resetGameStats();
}

function resetLevel() {
    resetGameStats();
}

function resetGameStats() {
    player.dead = false;
    player.position = { x: 200, y: 0 };
    
    enemy.health = 100;
    enemy.mana = 0;
    enemy.dead = false;
    enemy.position = { x: 800, y: 0 };
    
    // Sortear um novo vilão no Next Level?!
    const keys = Object.keys(CHARACTERS);
    const aiKey = keys[Math.floor(Math.random() * keys.length)];
    enemy.color = CHARACTERS[aiKey].color;
    document.getElementById('p2-name').innerText = "IA " + aiKey.toUpperCase();
    
    timer = 60;
    document.getElementById('timer').innerText = timer;
    document.getElementById('message-display').style.display = 'none';
    gameFinished = false;
    
    clearTimeout(timerId);
    decreaseTimer();
    
    updateUI();
}

function updateUI() {
    document.getElementById('p1-health').style.width = player.health + '%';
    document.getElementById('p2-health').style.width = enemy.health + '%';
    document.getElementById('p1-mana').style.width = player.mana + '%';
    document.getElementById('p2-mana').style.width = enemy.mana + '%';
}

let lastAiCall = 0;
function aiLogic(currentTime) {
    if (gameFinished || enemy.dead || player.dead) return;

    if (currentTime - lastAiCall < aiReactionDelay) return;
    lastAiCall = currentTime;

    const distance = player.position.x - enemy.position.x;
    
    if (Math.abs(distance) > 120) {
        if (distance > 0) {
            enemy.velocity.x = 4;
        } else {
            enemy.velocity.x = -4;
        }
    } else {
        enemy.velocity.x = 0;
        
        const action = Math.random();
        if (action < 0.4) {
            enemy.attack('punch');
            checkHit(enemy, player, aiDamageMultiplier);
        } else if (action < 0.6) {
            enemy.attack('kick');
            checkHit(enemy, player, aiDamageMultiplier);
        } else if (action < 0.7 && enemy.mana >= 100) {
            enemy.attack('special');
            checkHit(enemy, player, aiDamageMultiplier);
        }
    }
}

function checkHit(attacker, defender, multiplier = 1) {
    if (
        rectangularCollision({
            rectangle1: attacker,
            rectangle2: defender
        }) &&
        attacker.isAttacking
    ) {
        attacker.isAttacking = false;
        defender.takeHit(attacker.damage * multiplier);
        attacker.mana = Math.min(100, attacker.mana + 15);
        defender.mana = Math.min(100, defender.mana + 10);
        updateUI();

        if (defender.health <= 0) {
            determineWinner({ player, enemy, timerId });
        }
    }
}

const bgColors = ['#222222', '#331111', '#113311', '#111133', '#333311'];

const bgImage = new Image();
bgImage.src = 'assets/bg.png';

function animate(currentTime) {
    window.requestAnimationFrame(animate);
    
    if (bgImage.complete && bgImage.naturalWidth !== 0) {
        ctx.globalAlpha = 0.5 + (0.1 * level); // Fica um pouco mais escuro ou diferente
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
        
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = bgColors[(level - 1) % bgColors.length] || '#222222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Renderizar "Chão"
    const floorGradient = ctx.createLinearGradient(0, canvas.height - 50, 0, canvas.height);
    floorGradient.addColorStop(0, '#444');
    floorGradient.addColorStop(1, '#111');
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    player.update(ctx, canvas.height);
    enemy.update(ctx, canvas.height);

    player.velocity.x = 0;
    let baseSpeed = player.speed || 5;
    if (keys.a.pressed && player.position.x > 0) {
        player.velocity.x = -baseSpeed;
    } else if (keys.d.pressed && player.position.x < canvas.width - player.width) {
        player.velocity.x = baseSpeed;
    }

    if (player.position.x < enemy.position.x) {
        player.attackBox.offset.x = 0;
        enemy.attackBox.offset.x = -50;
    } else {
        player.attackBox.offset.x = -50;
        enemy.attackBox.offset.x = 0;
    }

    aiLogic(currentTime);
}

animate(0);

window.addEventListener('keydown', (event) => {
    if (!player.dead && !gameFinished) {
        switch (event.key.toLowerCase()) {
            case 'd':
            case 'arrowright':
                keys.d.pressed = true;
                break;
            case 'a':
            case 'arrowleft':
                keys.a.pressed = true;
                break;
            case 'w':
            case 'arrowup':
                if (player.isGrounded) player.velocity.y = -15;
                break;
            case ' ':
                if (player.isGrounded) player.velocity.y = -15;
                break;
            case 'j':
                player.attack('punch');
                checkHit(player, enemy);
                break;
            case 'k':
                player.attack('kick');
                checkHit(player, enemy);
                break;
            case 'l':
                if (player.mana >= 100) {
                    player.attack('special');
                    checkHit(player, enemy);
                }
                break;
        }
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'd':
        case 'arrowright':
            keys.d.pressed = false;
            break;
        case 'a':
        case 'arrowleft':
            keys.a.pressed = false;
            break;
    }
});
