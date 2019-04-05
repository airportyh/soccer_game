interface FrameImageInfo {
    src: string;
    width: number;
    height: number
}

interface Point {
    x: number;
    y: number;
}

type Action = "Idle" | "Jump" | "Run" | "Shoot" | "Slide" | "Walk";
type Direction = "left" | "right";
type PlayerState = Action;

type KeyStates = {
    [key: string]: boolean;
}

class Goal {
    constructor(private xPosition: number) {}

    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = "red";
        ctx.fillRect(this.xPosition, 200, 5, 100);
    }
}

class Player {
    teamNo: number;
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    direction: Direction;
    state: PlayerState;
    currentAnimation: IterableIterator<FrameImageInfo>;

    constructor(x: number, y: number, teamNo: number) {
        this.x = x;
        this.y = y;
        this.teamNo = teamNo;
        this.direction = "right";
        this.speedX = 0;
        this.speedY = 0;
        this.state = "Idle";
        this.initializeAnimation();
    }

    initializeAnimation(loop: boolean = true): void {
        this.currentAnimation = animationSequence(this.teamNo, this.state, loop)
    }

    render(ctx: CanvasRenderingContext2D): void {
        let iterResult = this.currentAnimation.next();
        if (iterResult.done) {
            this.state = "Idle";
            this.initializeAnimation();
            iterResult = this.currentAnimation.next();
        }
        const info = iterResult.value;
        const width = info.width / 8;
        const height = info.height / 8;
        const img = getImage(info.src);
        if (this.direction === "right") {   
            ctx.drawImage(
                img, 
                this.x - width / 2, this.y - height / 2, 
                width, height
            );
        } else {
            ctx.save();
            ctx.translate(2 * this.x, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 
                this.x - width / 2, this.y - height / 2, 
                width, height
            );
            ctx.restore();
        }
        const feet = this.feetPosition();
        if (distance(feet, ball) < 60) {
            ctx.fillStyle = "red";
        } else {
            ctx.fillStyle = "yellow";
        }
        ctx.fillRect(feet.x, feet.y, 5, 5);
    }

    isCloseToZero(num: number): boolean {
        return Math.abs(num) < 0.01;
    }

    update(): void { 
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Simulated friction
        this.speedX = this.speedX * 0.8;
        this.speedY = this.speedY * 0.8;

        if (this.isCloseToZero(this.speedX) && 
            this.isCloseToZero(this.speedY) && this.state === "Run") {
            this.state = "Idle";
            this.initializeAnimation();
        }
    }

    shoot(): void {
        this.state = "Shoot";
        this.initializeAnimation(false);
    }

    slide(): void {
        this.state = "Slide";
        this.initializeAnimation(false);
    }

    accelerateX(speedDelta: number): void {
        const newSpeed = this.speedX + speedDelta;
        // if (Math.abs(newSpeed) > 10) {
        //     return;
        // }
        this.speedX = newSpeed;
        if (this.speedX < 0) {
            this.direction = "left";
        } else {
            this.direction = "right";
        }
        if (this.state === "Idle" && Math.abs(this.speedX) > 0) {
            this.state = "Run";
            this.initializeAnimation();
        }
    }

    accelerateY(speedDelta: number): void {
        const newSpeed = this.speedY + speedDelta;
        // if (Math.abs(newSpeed) > 5) {
        //     return;
        // }
        this.speedY = newSpeed;
        if (this.state === "Idle" && Math.abs(this.speedY) > 0) {
            this.state = "Run";
            this.initializeAnimation();
        }
    }

    feetPosition(): Point {
        return {
            x: this.x - 12,
            y: this.y + 55
        };
    }
}

class Ball {
    x: number;
    y: number;
    z: number;
    speedX: number;
    speedY: number;
    speedZ: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.speedX = 0;
        this.speedY = 0;
        this.speedZ = 0;
    }

    accelerateX(speedDelta: number): void {
        const newSpeed = this.speedX + speedDelta;
        this.speedX = newSpeed;
    }

    accelerateY(speedDelta: number): void {
        const newSpeed = this.speedY + speedDelta;
        this.speedY = newSpeed;
    }

    update(): void { 
        this.x += this.speedX;
        this.y += this.speedY;
        
        // simulated friction
        this.speedX = this.speedX * 0.8;
        this.speedY = this.speedY * 0.8;
    }

    render(ctx: CanvasRenderingContext2D): void {
        const ballDiameter = 15;
        ctx.drawImage(ballImg, 
            this.x - ballDiameter / 2, this.y - ballDiameter / 2, 
            ballDiameter, ballDiameter
        );
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x, this.y, 5, 5);
    }
}

function square(n: number): number {
    return n * n;
}

function distance(one: Point, other: Point): number {
    return Math.sqrt(square(one.x - other.x) + square(one.y - other.y));
}

const keyStates: KeyStates = {};

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
const canvasHeight = 650;
const canvasWidth = canvasHeight * 1.93;
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.style.border = "1px solid black";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
document.body.style.overflow = "hidden";
if (!ctx) {
    throw new Error("Could not get canvas context.");
}

const pitchImg = new Image();
pitchImg.src = "assets/pitch.png";
const ballImg = new Image();
ballImg.src = "assets/ball.png";
const playersImg = new Image();
playersImg.src = "assets/players.png";
const images: {
    [src: string]: HTMLImageElement
} = {};

let currentPlayerNo = 1;
const animationNames: Action[] = ["Idle", "Jump", "Run", "Shoot", "Slide", "Walk"];
let currentAnimationIdx = 0;
const animations = {
    Idle: { width: 330, height: 794, poses: 4, framesPerPose: 15 },
    Jump: { width: 448, height: 809, poses: 6, framesPerPose: 5 },
    Run:  { width: 585, height: 784, poses: 10, framesPerPose: 5 },
    Shoot: { width: 556, height: 784, poses: 9, framesPerPose: 3 },
    Slide: { width: 591, height: 778, poses: 8, framesForEachPose: [10, 10, 10, 10, 10, 10 , 5, 5] },
    Walk: { width: 397, height: 774, poses: 8, framesPerPose: 10 }
};

function getImage(src: string): HTMLImageElement {
    if (src in images) {
        return images[src];
    } else {
        const img = new Image();
        img.src = src;
        images[src] = img;
        return img;
    }
}

function * animationSequence(playerNumber: number, action: Action, loop: boolean): IterableIterator<FrameImageInfo> {
    let seqNo = 1;
    const info = animations[action];
    const framesForEachPose = info["framesForEachPose"];
    const framesPerPose = info["framesPerPose"];
    while (true) {
        const src = `assets/Soccer Player ${playerNumber}/${action} ${playerNumber}-${seqNo}.png`;
        
        const numFrames = framesPerPose || framesForEachPose[seqNo - 1];
        for (let i = 0; i < numFrames; i++) {
            yield {
                src,
                width: info.width,
                height: info.height
            };
        }
        seqNo++;
        if (seqNo === info.poses) {
            if (loop) {
                seqNo = 1;
            } else {
                break;
            }
        }
    }
}

const player1: Player = new Player(200, 280, 1);
const player2: Player = new Player(400, 280, 1);
const player3: Player = new Player(300, 280, 1);
const player4: Player = new Player(900, 280, 1);
const player5: Player = new Player(700, 280, 5);
const player6: Player = new Player(800, 280, 4);
const player7: Player = new Player(1000, 280,3);
const player8: Player = new Player(999, 280,3);
const player9: Player = new Player(589, 280,3);
const player10: Player = new Player(583, 280,2);
const player11: Player = new Player(80, 280,3);
const player12: Player = new Player(582, 280,3);
const player13: Player = new Player(577, 280,3);
const player14: Player = new Player(563, 280,3);
const player15: Player = new Player(863, 280,3);
const player16: Player = new Player(431, 280,3);
const player17: Player = new Player(693, 511,3);

const players: Player[] = [
    player1,
    player2,
    player3,
    player4,
    player5,
    player6,
    player7,
    player8,
    player9,
    player10,
    player11,
    player12,
    player13,
    player14,
    player15,
    player16,
    player17
];

let currentPlayerIdx = 0;

const ball: Ball = new Ball(canvasWidth / 2, canvasHeight / 2);

function render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(pitchImg, 0, 0, canvasWidth, canvasHeight);
    for (let player of players) {
        player.render(ctx);
    }
    ball.render(ctx);
    if (cursorX && cursorY) {
        ctx.textBaseline = "top";
        ctx.fillText(`(${cursorX}, ${cursorY})`, 0, 0);
    }
}

let shootState: "open" | "holding" = "open";
let holdStartTime;

window.addEventListener("keydown", (event) => {
    const player = players[currentPlayerIdx];
    if (event.key === " " && shootState === "open") {
        shootState = "holding";
        holdStartTime = new Date().getTime();
    }
    if (event.key === "Enter") {
        player.slide();
    }
    if (event.key === "Tab") {
        currentPlayerIdx++;
        if (currentPlayerIdx >= players.length) {
            currentPlayerIdx = 0;
        }
        event.preventDefault();
    }
    const num = Number(event.key);
    if (num >= 1 && num <= 6) {
        currentPlayerIdx = num - 1;
    }
    keyStates[event.key] = true;
});

window.addEventListener("keyup", (event) => {
    keyStates[event.key] = false;
    const player = players[currentPlayerIdx];
    if (shootState === "holding") {
        shootState = "open";
        const timeInterval = new Date().getTime() - holdStartTime;
        const acceleration = timeInterval / 10;
        player.shoot();
        if (distance(player.feetPosition(), ball) < 785) {
            if (player.direction === "right") {
                ball.accelerateX(acceleration);
            } else if (player.direction === "left") {
                ball.accelerateX(-acceleration);
            }
        } else {
            console.log("ball not going");
        }
    }
});

let cursorX: number;
let cursorY: number;

window.addEventListener("mousemove", (e) => {
    cursorX = e.pageX;
    cursorY = e.pageY;
});

window.addEventListener("dblclick", (event: MouseEvent) => {
    const x = event.pageX;
    const y = event.pageY;
    ball.x = x;
    ball.y = y;
});

function update() {
    const player = players[currentPlayerIdx];
    if (keyStates.ArrowRight) {
        player.accelerateX(3);
    }
    if (keyStates.ArrowLeft) {
        player.accelerateX(-3);
    }
    if (keyStates.ArrowUp) {
        player.accelerateY(-2);
    }
    if (keyStates.ArrowDown) {
        player.accelerateY(2);
    }
    for (let player of players) {
        player.update();
    }
    ball.update();
}

const renderIt = () => {
    render(ctx);
    update();
    requestAnimationFrame(renderIt);
};
requestAnimationFrame(renderIt);