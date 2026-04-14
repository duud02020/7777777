    constructor({ position, width, height, color, imageSrc }) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.color = color;
        this.image = new Image();
        this.processedImage = null; // Versão sem fundo
        
        if (imageSrc) {
            this.image.src = imageSrc;
            this.image.onload = () => {
                this.removeBackground();
            };
        }
    }

    removeBackground() {
        // Criar um canvas temporário para processar a imagem
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        
        tempCtx.drawImage(this.image, 0, 0);
        const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imgData.data;

        // Chroma Key: Se os pixels forem quase brancos, deixa transparente (Alpha = 0)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Aumentando a sensibilidade para pegar sombras leves do fundo branco
            if (r > 200 && g > 200 && b > 200) {
                data[i + 3] = 0;
            }
        }

        tempCtx.putImageData(imgData, 0, 0);
        this.processedImage = new Image();
        this.processedImage.src = tempCanvas.toDataURL();
    }

    draw(ctx) {
        let drawImg = this.processedImage || (this.image.complete ? this.image : null);
        
        if (drawImg && drawImg.src) {
            ctx.drawImage(drawImg, this.position.x, this.position.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        }
    }
    update(ctx) {
        this.draw(ctx);
    }
}

class Fighter extends Sprite {
    constructor({ position, velocity, width = 50, height = 150, color, offset = {x: 0, y: 0}, imageSrc }) {
        super({ position, width, height, color, imageSrc });
        this.velocity = velocity;
        this.gravity = 0.7;
        this.isGrounded = false;
        
        this.health = 100;
        this.mana = 0;
        
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset,
            width: 100,
            height: 50
        };
        this.isAttacking = false;
        this.attackType = null;
        this.damage = 10;
        this.dead = false;
    }

    draw(ctx) {
        // Se tiver imagem (SKIN), desenha ela em vez de palitinho
        let drawImg = this.processedImage || (this.image.complete ? this.image : null);
        
        if (drawImg && drawImg.naturalWidth !== 0) {
            ctx.save();
            
            const dir = this.attackBox.offset.x === 0 ? 1 : -1;
            if (dir === -1) {
                ctx.translate(this.position.x + this.width, this.position.y);
                ctx.scale(-1, 1);
                ctx.drawImage(drawImg, 0, 0, this.width, this.height);
            } else {
                ctx.drawImage(drawImg, this.position.x, this.position.y, this.width, this.height);
            }

            // Brilho neon sutil em volta da imagem da skin
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            // Linha da Hitbox do Corpo (DEBUG)
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
            
            ctx.restore();
        } else {
            // Desenho estilo "Stickman Guerreiro de Neon" (FALLBACK)
            ctx.save();
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const cx = this.position.x + this.width / 2;
            const cy = this.position.y;
            
            // Direção que o jogador está virado (baseada no offset do attackBox no game.js)
            const dir = this.attackBox.offset.x === 0 ? 1 : -1;
            
            ctx.beginPath();
            
            // Cabeça
            ctx.arc(cx, cy + 25, 18, 0, Math.PI * 2);
            
            // Corpo/Coluna
            ctx.moveTo(cx, cy + 43);
            ctx.lineTo(cx, cy + 90);
            
            // Perna de Trás
            ctx.moveTo(cx, cy + 90);
            ctx.lineTo(cx - 20 * dir, cy + 140);

            // Perna da Frente (com animação de chute)
            ctx.moveTo(cx, cy + 90);
            if (this.isAttacking && this.attackType === 'kick') {
                ctx.lineTo(cx + 60 * dir, cy + 80); // Chute alto
            } else {
                ctx.lineTo(cx + 25 * dir, cy + 140); // Base normal
            }
            
            // Braço de Trás
            ctx.moveTo(cx, cy + 55);
            ctx.lineTo(cx - 20 * dir, cy + 85);
            
            // Braço da Frente (com animação de soco/especial)
            ctx.moveTo(cx, cy + 55);
            if (this.isAttacking) {
                if (this.attackType === 'punch') {
                    ctx.lineTo(cx + 60 * dir, cy + 55); // Soco reto
                } else if (this.attackType === 'special') {
                    ctx.lineTo(cx + 50 * dir, cy + 30); // Gancho/especial
                } else {
                    ctx.lineTo(cx + 25 * dir, cy + 75); // Normal no chute
                }
            } else {
                ctx.lineTo(cx + 25 * dir, cy + 75); // Guarda alta
            }
            
            ctx.stroke();

            // Olho (Brilho focado)
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx + 8 * dir, cy + 20, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Hitbox Visual de Ataque (Impacto)
        if (this.isAttacking) {
            ctx.save();
            ctx.strokeStyle = '#ff0000'; // Vermelho para ataque
            ctx.lineWidth = 3;
            ctx.strokeRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.width, this.attackBox.height);
            
            // Efeito visual de preenchimento
            ctx.fillStyle = (this.attackType === 'special') ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.width, this.attackBox.height);
            ctx.restore();
        }
    }

    update(ctx, canvasHeight) {
        this.draw(ctx);
        
        if (this.dead) return;

        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Gravidade e chão
        if (this.position.y + this.height + this.velocity.y >= canvasHeight - 50) {
            this.velocity.y = 0;
            this.position.y = canvasHeight - 50 - this.height;
            this.isGrounded = true;
        } else {
            this.velocity.y += this.gravity;
            this.isGrounded = false;
        }
        
        // Paredes laterais
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > 1024) this.position.x = 1024 - this.width;
    }

    attack(type) {
        this.isAttacking = true;
        this.attackType = type;
        if (type === 'punch') {
            this.damage = 10;
            this.attackBox.width = 100;
        } else if (type === 'kick') {
            this.damage = 15;
            this.attackBox.width = 120;
        } else if (type === 'special') {
            this.damage = 30;
            this.mana = 0;
            this.attackBox.width = 150;
        }
        setTimeout(() => {
            this.isAttacking = false;
        }, 150);
    }
    
    takeHit(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }
}
