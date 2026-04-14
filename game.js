const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let level = 1;
let timer = 60;
let timerId;
let gameFinished = false;
let isStarted = false;
let gameMode = 'arcade';
let tutorialStep = 0;

const CHARACTERS = {
    'hanzo': { color: '#555555', speed: 6, dmgBase: 1.0 },
    'ignis': { color: '#ff3300', speed: 4.5, dmgBase: 1.5 },
    'glacius': { color: '#00d9ff', speed: 5.5, dmgBase: 1.2 },
    'aurum': { color: '#ffea00', speed: 3.8, dmgBase: 1.8 },
    'nova': { color: '#a200ff', speed: 7.5, dmgBase: 0.8 }
};

let player = new Fighter({
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#00ff00',
    offset: { x: 50, y: 50 },
    width: 200, height: 250
});

let enemy = new Fighter({
    position: { x: 700, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#ff0000',
    offset: { x: -80, y: 50 },
    width: 200, height: 250
});

const keys = { a: { pressed: false }, d: { pressed: false } };
let particles = [];
let ambientParticles = []; // Neve/Fagulhas de fundo
let screenShake = 0;

function createAmbientParticles() {
    if (ambientParticles.length < 50) {
        ambientParticles.push(new Particle({
            position: { x: Math.random() * 1024, y: -20 },
            velocity: { x: (Math.random() - 0.5) * 2, y: Math.random() * 3 + 1 },
            color: 'rgba(255, 255, 255, 0.2)', size: Math.random() * 3,
            fadeSpeed: 0.005
        }));
    }
}

// AUDIO SYNTH
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSFX(freq, type, dur) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function createHitFx(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle({
            position: { x, y },
            velocity: { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 },
            color: color, size: Math.random() * 6 + 2
        }));
    }
    screenShake = 15;
}

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    );
}

function decreaseTimer() {
    if (!isStarted || gameFinished) return;
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        document.getElementById('timer').innerText = timer;
    } else determineWinner();
}

window.previewCharacter = function(charKey, name, color) {
    document.getElementById('p1-preview-name').innerText = name;
    let p = document.getElementById('p1-big-portrait');
    p.style.borderColor = color;
    p.style.backgroundImage = `url('assets/${charKey}.png')`;
    p.style.backgroundSize = 'cover';
    p.style.backgroundPosition = 'center';
    document.getElementById('p1-silhouette').style.display = 'none';
};

window.setMode = function(m) {
    gameMode = m;
    document.getElementById('btn-arcade').classList.toggle('active', m === 'arcade');
    document.getElementById('btn-tutorial').classList.toggle('active', m === 'tutorial');
};

window.selectCharacter = function(charKey) {
    document.getElementById('char-select').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'flex';
    const d = CHARACTERS[charKey];
    player.color = d.color; player.speed = d.speed; player.dmgMult = d.dmgBase;
    player.image.src = `assets/${charKey}.png`;
    document.getElementById('p1-name').innerText = charKey.toUpperCase();
    
    // Sortear Inimigo
    const ks = Object.keys(CHARACTERS);
    const ak = ks[Math.floor(Math.random() * ks.length)];
    enemy.color = CHARACTERS[ak].color; enemy.speed = CHARACTERS[ak].speed; enemy.dmgMult = CHARACTERS[ak].dmgBase;
    enemy.image.src = `assets/${ak}.png`;
    document.getElementById('p2-name').innerText = "CPU " + ak.toUpperCase();
    
    isStarted = true;
    if (gameMode === 'tutorial') startTutorial(); else decreaseTimer();
};

function startTutorial() {
    document.getElementById('timer').innerText = "∞";
    document.getElementById('tutorial-overlay').style.display = 'block';
    tutorialStep = 1; updateTutorialText("Use <span class='key-btn'>A</span> / <span class='key-btn'>D</span> para mover");
}

function updateTutorialText(t) { document.getElementById('tutorial-text').innerHTML = t; }

function updateTutorialLogic(k) {
    if (tutorialStep === 1 && (k === 'a' || k === 'd')) { tutorialStep = 2; updateTutorialText("Pule com <span class='key-btn'>W</span>"); }
    else if (tutorialStep === 2 && (k === 'w' || k === ' ')) { tutorialStep = 3; updateTutorialText("Soco <span class='key-btn'>J</span>"); }
    else if (tutorialStep === 3 && k === 'j') { tutorialStep = 4; updateTutorialText("Chute <span class='key-btn'>K</span>"); }
    else if (tutorialStep === 4 && k === 'k') { tutorialStep = 5; player.mana = 100; updateUI(); updateTutorialText("ESPECIAL <span class='key-btn'>L</span>"); }
    else if (tutorialStep === 5 && k === 'l') { tutorialStep = 6; updateTutorialText("PRONTO!"); setTimeout(() => { resetLevel(); document.getElementById('tutorial-overlay').style.display='none'; gameMode='arcade'; }, 2000); }
}

function determineWinner() {
    gameFinished = true; clearTimeout(timerId);
    const m = document.getElementById('message-display'); m.style.display = 'block';
    if (player.health > enemy.health) { m.innerHTML = "VENCEU!"; setTimeout(() => { level++; resetLevel(); }, 2000); }
    else { m.innerHTML = "DERROTA"; setTimeout(resetLevel, 2000); }
}

function resetLevel() {
    player.health = 100; player.mana = 0; player.position.x = 100; player.dead = false;
    enemy.health = 100; enemy.mana = 0; enemy.position.x = 700; enemy.dead = false;
    timer = 60; gameFinished = false; document.getElementById('message-display').style.display='none';
    const ks = Object.keys(CHARACTERS);
    const ak = ks[Math.floor(Math.random() * ks.length)];
    enemy.image.src = `assets/${ak}.png`; enemy.color = CHARACTERS[ak].color;
    document.getElementById('level-number').innerText = level;
    updateUI(); if (gameMode !== 'tutorial') decreaseTimer();
}

function updateUI() {
    document.getElementById('p1-health').style.width = player.health + '%';
    document.getElementById('p2-health').style.width = enemy.health + '%';
    document.getElementById('p1-mana').style.width = player.mana + '%';
    document.getElementById('p2-mana').style.width = enemy.mana + '%';
}

function checkHit(atk, def) {
    if (rectangularCollision({ rectangle1: atk, rectangle2: def }) && atk.isAttacking) {
        atk.isAttacking = false;
        def.takeHit(atk.damage * atk.dmgMult);
        atk.mana = Math.min(100, atk.mana + 15);
        createHitFx(def.position.x + def.width/2, def.position.y + def.height/2, atk.color);
        playSFX(150, 'square', 0.1); 
        updateUI();
        if (def.health <= 0) determineWinner();
    }
}

const bg = new Image(); bg.src = 'assets/bg.png';

function animate() {
    window.requestAnimationFrame(animate);
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    ctx.save();
    if (screenShake > 0) { ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake); screenShake *= 0.8; }
    
    if (bg.complete) {
        ctx.globalAlpha = 0.3; ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.globalAlpha = 1;
    }
    
    // Partículas de Ambiente
    createAmbientParticles();
    ambientParticles.forEach((p, i) => { 
        if (p.alpha <= 0 || p.position.y > 600) ambientParticles.splice(i, 1); 
        else p.update(ctx); 
    });

    player.update(ctx, canvas.height);
    enemy.update(ctx, canvas.height);

    player.velocity.x = 0;
    if (keys.a.pressed) player.velocity.x = -player.speed;
    else if (keys.d.pressed) player.velocity.x = player.speed;

    player.attackBox.offset.x = player.position.x < enemy.position.x ? 50 : -180;
    enemy.attackBox.offset.x = enemy.position.x < player.position.x ? 50 : -180;

    // AI MASTER
    if (isStarted && !gameFinished && gameMode !== 'tutorial') {
        const d = player.position.x - enemy.position.x;
        if (Math.abs(d) > 180) enemy.velocity.x = d > 0 ? 3 + level*0.5 : -3 - level*0.5;
        else {
            enemy.velocity.x = 0;
            if (Math.random() < 0.03 + level*0.01) { enemy.attack('punch'); checkHit(enemy, player); }
        }
    }

    particles.forEach((p, i) => { if (p.life <= 0) particles.splice(i, 1); else p.update(ctx); });
    ctx.restore();
}

animate();

window.addEventListener('keydown', (e) => {
    if (player.dead || gameFinished) return;
    const k = e.key.toLowerCase();
    if (gameMode === 'tutorial') updateTutorialLogic(k);
    if (k === 'a') keys.a.pressed = true; if (k === 'd') keys.d.pressed = true;
    if (k === 'w' && player.isGrounded) { player.velocity.y = -18; playSFX(300, 'sine', 0.1); }
    if (k === 'j') { player.attack('punch'); checkHit(player, enemy); playSFX(200, 'triangle', 0.1); }
    if (k === 'k') { player.attack('kick'); checkHit(player, enemy); playSFX(180, 'triangle', 0.1); }
    if (k === 'l' && player.mana >= 100) { player.attack('special'); checkHit(player, enemy); playSFX(500, 'sawtooth', 0.2); }
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a') keys.a.pressed = false; if (k === 'd') keys.d.pressed = false;
});
