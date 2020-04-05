const WALL_CELL = 0 // клетка со стеной
const EMPTY_CELL = 1 // пустая клетка

const LEFT = "left"
const RIGHT = "right"
const UP = "up"
const DOWN = "down"

// генератор лабиринтов
function MazeGenerator(n, m) {
    this.n = n
    this.m = m
    this.matrix = []

    for (let i = 0; i < 2*n + 1; i++) {
        this.matrix[i] = []

        for (let j = 0; j < 2*m + 1; j++)
            this.matrix[i][j] = WALL_CELL
    }

    // словарь направлений
    this.dirsX = {}
    this.dirsY = {}
    
    this.dirsX[LEFT] = -1
    this.dirsY[LEFT] = 0

    this.dirsX[RIGHT] = 1
    this.dirsY[RIGHT] = 0

    this.dirsX[UP] = 0
    this.dirsY[UP] = -1

    this.dirsX[DOWN] = 0
    this.dirsY[DOWN] = 1
}

// обновление состояния стены в точке (x, y) и направлении dir
MazeGenerator.prototype.SetWallState = function(x, y, dir, state) {
    let xi = 2 * x + 1 + this.dirsX[dir]
    let yi = 2 * y + 1 + this.dirsY[dir]
    this.matrix[yi][xi] = state
}

// получение состояния стены в точке (x, y) и направлении dir
MazeGenerator.prototype.GetWallState = function(x, y, dir) {
    let xi = 2 * x + 1 + this.dirsX[dir]
    let yi = 2 * y + 1 + this.dirsY[dir]
    return this.matrix[yi][xi]
}

// генерация лабиринта
MazeGenerator.prototype.Generate = function(type) {

}

// добавление стен в лабиринт
MazeGenerator.prototype.SetLabitynth = function(labirynth) {
    labirynth.walls = []

    for (let i = 0; i < 2*this.n + 1; i++)
        for (let j = 0; j < 2*this.m + 1; j++)
            if ((i + j) % 2 == 1 && this.matrix[i][j] == WALL_CELL)
                labirynth.AddWall(Math.floor(j / 2), Math.floor(i / 2), i % 2 == 0)
}