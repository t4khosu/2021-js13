import Entity from "./entity";
import {randInt, seedRand, TileEngine} from "kontra";
import {CANVAS_HEIGHT, CANVAS_WIDTH} from "../globals";
import NPC from "./npc";

let rand = seedRand('kontra');

class Crossroad {
    start: number;
    end: number;
    genTick: number = 50;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    getWalkingNPC() {
        let dir = randInt(0, 1) * 2 - 1;
        let xPos = randInt(this.start * 9 + 5, this.end * 9 - 5);
        let yPos = dir > 0 ? randInt(-50, -10) : randInt(CANVAS_HEIGHT + 10, CANVAS_HEIGHT + 50);
        return new NPC(xPos, yPos, randInt(1, 2), 0, dir * Math.max(0.3, rand()))
    }

    visible(leftBorder: number, rightBorder: number) {
        return rightBorder > this.start * 9 && leftBorder < this.end * 9;
    }
}

export default class World {
    children: Array<Entity> = [];
    tileEngine: any;
    focusPoint: Entity;
    crossroads: Array<Crossroad> = [];
    heightInTiles: number;
    widthInTiles: number = 5000;
    heightInPixels: number;
    borderRight: number;
    genTick: number = 10;
    timer: number = 0;

    TILE_SIZE: number = 9;
    BORDER_SIZE: number = 100;


    constructor(focusPoint: Entity, tileAsset: any) {
        this.focusPoint = focusPoint;

        this.heightInTiles = Math.ceil(CANVAS_HEIGHT / this.TILE_SIZE)
        this.heightInPixels = this.heightInTiles * this.TILE_SIZE;
        this.borderRight = CANVAS_WIDTH - this.BORDER_SIZE;

        this.initTileEngine(tileAsset);
        this.focus();
    }

    addChild(child: Entity) {
        if (this.children.length < 50) {
            child.setWorld(this);
            this.children.push(child);
        }
    }

    initTileEngine(tileAsset: any) {
        this.tileEngine = TileEngine({
            // tile size
            tilewidth: 9,
            tileheight: 9,

            // map size in tiles
            width: this.widthInTiles,
            height: this.heightInTiles,

            // tileset object
            tilesets: [{
                firstgid: 1,
                image: tileAsset,
            }],

            // layer object
            layers: [{
                name: 'ground',
                data: this.getGroundTiles(),
            }]
        });
    }

    noCrossroadAt(x: number) {
        for (let cr of this.crossroads) {
            if (x >= cr.start && x <= cr.end) {
                return false;
            }
        }
        return true;
    }

    getGroundTiles() {
        let groundTiles = [];

        for (let i = 0; i < Math.floor(this.widthInTiles / 150); i++) {
            let min = i + 1;
            let max = 150 * (i + 1) - 1;
            let width = randInt(5, 15);
            let start = randInt(min, max - width);
            this.crossroads.push(new Crossroad(start, start + width));
        }

        for (let y = 0; y < this.heightInTiles; y++) {
            for (let x = 0; x < this.widthInTiles; x++) {
                if ((y < 2 || y > this.heightInTiles - 3) && this.noCrossroadAt(x)) {
                    groundTiles.push(2);
                } else {
                    groundTiles.push(1);
                }
            }
        }

        return groundTiles;
    }

    addWalkingNPC(npcType: number = 1) {
        let dir = randInt(0, 1) * 2 - 1;

        let yPos = randInt(10, this.heightInPixels - 5);

        let right = this.tileEngine.sx + CANVAS_WIDTH;
        let xPos = dir > 0 ? randInt(-50, this.tileEngine.sx - 10) : randInt(right + 10, right + 50)

        this.addChild(new NPC(xPos, yPos, npcType, dir * Math.max(0.3, rand())))
    }

    addStandingNPC(npcType: number = 1) {
        let yPos = randInt(0, 1) == 0 ? randInt(10, this.heightInPixels / 3) : randInt(this.heightInPixels / 3 * 2, this.heightInPixels - 5);
        let right = this.tileEngine.sx + CANVAS_WIDTH;
        let xPos = randInt(right + 10, right + 50)

        this.addChild(new NPC(xPos, yPos, npcType))
    }


    focus() {
        /* Focus is based on the Game borders
        *
        |-------------------------------------|
        |     |                         |     |
        |     |                         |     |
        |     |     p                   |     |
        |     |                         |     |
        |-------------------------------------|
        | rb  ^                         ^ lb  |
        *   
        * rb = right border, lb = left border, p = player
        * The camera follows the player in the inner range.
        * If the player collides with an inner border, the camera moves.
        * Once the end of the level is reacherd, the player can also enter the border areas
        */

        let vsx_right = this.focusPoint.globalX - this.globalBorderRight();

        if (vsx_right > 0 && this.focusPoint.globalX < 20000 - this.BORDER_SIZE) {
            this.tileEngine._sx += vsx_right;
        }
    }

    globalBorderRight() {
        return Math.min(this.tileEngine.sx + this.borderRight, 20000);
    }

    clearChildren() {
        let children: Entity[] = [];

        for (let child of this.children) {
            if (!child.delete) {
                children.push(child);
            }
        }

        this.children = children;
    }

    ticker() {
        this.timer += 1;

        if (this.timer % this.genTick == 0) {
            if (randInt(0, 4) < 4) {
                this.addWalkingNPC(randInt(1, 2))
            } else {
                this.addStandingNPC(randInt(1, 2));
            }
        }

        for (let cr of this.crossroads) {
            if (cr.visible(this.tileEngine.sx, this.tileEngine.sx + CANVAS_WIDTH + 200)) {
                if (this.timer % cr.genTick == 0) {
                    this.addChild(cr.getWalkingNPC())
                }
            }
        }
    }

    update() {
        this.ticker()

        // Sprites must be sorted to make sure, which Entity is in the background and which in the foreground
        this.clearChildren();
        this.children.sort((a: Entity, b: Entity) => a.y < b.y ? -1 : 1);

        for (const child of this.children) {
            child.update();
        }

        // Refocus player if moved
        this.focus()
    }

    render() {
        this.tileEngine.render();
        for (const child of this.children) {
            child.render();
        }
    }
}