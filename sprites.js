class Sprite {
    constructor({ position, width, height, color }) {
        this.position = position;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
    update(ctx) {
        this.draw(ctx);
    }
}

class Fighter extends Sprite {
    constructor({ position, velocity, width = 50, height = 150, color, offset = {x: 0, y: 0} }) {
        super({ position, width, height, color });
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
        super.draw(ctx);
        // Desenhando hitbox de ataque se estiver atacando
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.width, this.attackBox.height);
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
        if (type === 'punch') this.damage = 10;
        else if (type === 'kick') this.damage = 15;
        else if (type === 'special') {
            this.damage = 30;
            this.mana = 0;
        }
        setTimeout(() => {
            this.isAttacking = false;
        }, 100);
    }
    
    takeHit(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }
}
