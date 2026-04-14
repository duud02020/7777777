class Particle {
    constructor({ position, velocity, color, size, fadeSpeed = 0.05 }) {
        this.position = { ...position };
        this.velocity = { ...velocity };
        this.color = color;
        this.size = size;
        this.alpha = 1;
        this.fadeSpeed = fadeSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update(ctx) {
        this.draw(ctx);
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.alpha -= this.fadeSpeed;
    }
}

class Sprite {
    constructor({ position, width, height, color, imageSrc }) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.color = color;
        this.image = new Image();
        this.processedImage = null; 
        
        if (imageSrc) {
            this.image.src = imageSrc;
            if (this.image.complete) {
                this.removeBackground();
            } else {
                this.image.onload = () => { this.removeBackground(); };
            }
        }
    }

    removeBackground() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.image.width;
        tempCanvas.height = this.image.height;
        tempCtx.drawImage(this.image, 0, 0);
        
        const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imgData.data;

        // CHROMA KEY AGRESSIVO (Apaga qualquer coisa próxima ao branco/claro)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Se o pixel for coletivamente muito claro (soma dos canais alta)
            if (r + g + b > 550) { 
                data[i + 3] = 0; 
            }
        }

        tempCtx.putImageData(imgData, 0, 0);
        this.processedImage = new Image();
        this.processedImage.src = tempCanvas.toDataURL();
    }

    draw(ctx) {
        let drawImg = this.processedImage || (this.image.complete ? this.image : null);
        if (drawImg) ctx.drawImage(drawImg, this.position.x, this.position.y, this.width, this.height);
    }
}

class Fighter extends Sprite {
    constructor({ position, velocity, width = 200, height = 250, color, offset = {x: 0, y: 0}, imageSrc }) {
        super({ position, width, height, color, imageSrc });
        this.velocity = velocity;
        this.gravity = 0.8;
        this.isGrounded = false;
        this.health = 100;
        this.mana = 0;
        this.attackBox = { position: { x: this.position.x, y: this.position.y }, offset, width: 140, height: 80 };
        this.isAttacking = false;
        this.attackType = null;
        this.dead = false;
        this.isHit = false;
        this.speed = 5;
        this.dmgMult = 1;
        
        this.animTimer = 0;
        this.scaleY = 1;
        this.tilt = 0;
        this.rotation = 0;
    }

    draw(ctx) {
        let drawImg = this.processedImage || (this.image.complete ? this.image : null);
        this.animTimer += 0.1;

        if (!this.dead) {
            this.scaleY = 1 + Math.sin(this.animTimer) * 0.02;
            if (Math.abs(this.velocity.x) > 0) {
                this.tilt = (this.velocity.x > 0 ? 0.05 : -0.05);
            } else {
                this.tilt *= 0.8;
            }
            if (!this.isGrounded) this.scaleY = 1.15;
        }

        ctx.save();
        
        // POSIÇÃO E TRANSFORMAÇÃO
        const midX = this.position.x + this.width / 2;
        const midY = this.position.y + this.height;
        ctx.translate(midX, midY);
        
        // EFEITO DE HIT (FLASH)
        if (this.isHit) {
            ctx.filter = 'brightness(5) contrast(2)';
            ctx.translate((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
        }

        // AURA ELEMENTAL (Substitui o fundo quadrado)
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(this.animTimer) * 0.1;
        ctx.shadowBlur = 40;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, -this.height/2, this.width/3, this.height/2, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        ctx.rotate(this.tilt + this.rotation);
        ctx.scale(1, this.scaleY);
        
        // DIREÇÃO
        const dir = this.attackBox.offset.x >= 0 ? 1 : -1;
        ctx.scale(dir, 1);

        if (drawImg && drawImg.naturalWidth !== 0) {
            // Desenho transferido para o DOM para garantir transparência total
            // ctx.drawImage(drawImg, -this.width / 2, -this.height, this.width, this.height);
        }
        
        ctx.restore();

        // HITBOX VISUAL (Sutil para gameplay profissional)
        if (this.isAttacking) {
            ctx.save();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.width, this.attackBox.height);
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

        if (this.position.y + this.height + this.velocity.y >= canvasHeight - 50) {
            this.velocity.y = 0;
            this.position.y = canvasHeight - 50 - this.height;
            this.isGrounded = true;
        } else {
            this.velocity.y += this.gravity;
            this.isGrounded = false;
        }

        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > 1024) this.position.x = 1024 - this.width;
    }

    attack(type) {
        this.isAttacking = true;
        this.attackType = type;
        const dir = this.attackBox.offset.x >= 0 ? 1 : -1;
        this.rotation = 0.1 * dir;
        this.position.x += 20 * dir;

        if (type === 'punch') { this.attackBox.width = 160; }
        else if (type === 'kick') { this.attackBox.width = 200; }
        else if (type === 'special') { this.attackBox.width = 300; this.mana = 0; }
        
        setTimeout(() => { 
            this.isAttacking = false; 
            this.rotation = 0;
        }, 150);
    }
    
    takeHit(damage) {
        this.health -= damage;
        this.isHit = true;
        const dir = this.attackBox.offset.x >= 0 ? -1 : 1;
        this.position.x += 30 * dir;
        setTimeout(() => { this.isHit = false; }, 120);
        if (this.health <= 0) { this.health = 0; this.dead = true; }
    }
}
