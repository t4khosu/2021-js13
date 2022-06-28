import {GameObjectClass, randInt, seedRand, Sprite, TileEngine} from "kontra";
import Player from "../entities/Player";
import {CANVAS_HEIGHT, CANVAS_WIDTH} from "../globals";
import MaskedNPC from "../entities/MaskedNPC";
import Entity from "../entities/Entity";

let rand = seedRand('x');

export class CrossRoad {
    startTileX: number
    endTileX: number
    level: Level

    constructor(startX: number, endX: number, level: Level) {
        this.startTileX = startX
        this.endTileX = endX
        this.level = level
    }

    generateNPC(){
        let ySpeed = (randInt(0, 1) * 2 - 1) * Math.max(0.3, rand())
        let x = randInt(this.startTileX * 9 + 5, this.endTileX * 9 - 5)
        let y = ySpeed > 0 ? randInt(-50, -10) : randInt(CANVAS_HEIGHT + 10, CANVAS_HEIGHT + 50)

        return new MaskedNPC(x, y, this.level, 0, ySpeed)
    }

    visible(leftBorder: number, rightBorder: number) {
        return rightBorder > this.startTileX * 9 && leftBorder < this.endTileX * 9
    }
}

export class Level extends GameObjectClass{
    numTilesWidth: number
    numTilesHeight: number
    tileWidth: number = 9
    tileHeight: number = 9
    rightBorder: number

    backgroundColorLayer: Sprite = Sprite()
    tileEngine!: TileEngine
    crossRoads: Array<CrossRoad> = []
    player!: Player
    entities: Array<Entity> = []

    constructor() {
        super()
        this.numTilesWidth = 100
        this.numTilesHeight = 11
        this.rightBorder = this.pixelWidth() - 50
    }

    addPlayerAt(player: Player, globalX: number, globalY: number){
        this.player = player
        this.player.level = this
        this.player.globalX = globalX
        this.player.globalY = globalY
        this.entities.push(this.player)
    }

    addWalkingNPC() {
        let dir = randInt(0, 1) * 2 - 1;
        let right = this.tileEngine.sx + CANVAS_WIDTH;

        let npc = new MaskedNPC(
            dir > 0 ? randInt(-50, this.tileEngine.sx - 10) : randInt(right + 10, right + 50),
            randInt(10, CANVAS_HEIGHT - 5),
            this,
            dir * Math.max(0.3, rand()),
            0
        )

        this.entities.push(npc)
    }

    removeEntity(entity: Entity){
        this.entities = this.entities.filter(function(value){
            return value != entity;
        });
    }

    sortEntities(){
        this.entities.sort((e1, e2) => e1.globalY - e2.globalY)
    }

    pixelWidth(){
        return this.numTilesWidth * this.tileWidth
    }

    getOffsetX(){
        return this.tileEngine ? this.tileEngine.sx : 0
    }

    getOffsetY(){
        return this.tileEngine ? this.tileEngine.sy : 0
    }

    render(){
        this.tileEngine.render()
        this.backgroundColorLayer.render()
        this.entities.forEach(entity => entity.rangeSprite.render())
        this.entities.forEach(entity => entity.shadowSprite.render())
        this.entities.forEach(entity => entity.entitySprite.render())
    }

    update(){
        this.sortEntities()
        this.entities.forEach(entity => entity.update())
    }
}