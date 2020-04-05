const WALL_CELL = 0 // клетка со стеной
const EMPTY_CELL = 1 // пустая клетка

const LEFT = "left"
const RIGHT = "right"
const UP = "up"
const DOWN = "down"
const DIRECTIONS = [LEFT, RIGHT, UP, DOWN]

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

// получение случайной клетки лабиринта
MazeGenerator.prototype.GetRandomCell = function() {
    let x = Math.floor(Math.random() * this.m)
    let y = Math.floor(Math.random() * this.n)

    return {x: x, y: y}
}

// получение следующей ячейки по направлению
MazeGenerator.prototype.GetNextCell = function(cell, direction) {
    let x = cell.x + this.dirsX[direction]
    let y = cell.y + this.dirsY[direction]

    return {x: x, y: y}
}

// получение возможных направлений
MazeGenerator.prototype.GetPosibleDirections = function(cell) {
    let directions = []

    if (cell.x > 0)
        directions.push(LEFT)

    if (cell.x < this.m - 1)
        directions.push(RIGHT)

    if (cell.y > 0)
        directions.push(UP)

    if (cell.y < this.n - 1)
        directions.push(DOWN)

    return directions
}

// получение случайного направления
MazeGenerator.prototype.GetRandomDirection = function(directions = DIRECTIONS) {
    return directions[Math.floor(Math.random() * directions.length)]
}

// проверка на посещение всех вершин
MazeGenerator.prototype.IsAllVisited = function(visited) {
    for (let i = 0; i < this.n; i++)
        for (let j = 0; j < this.m; j++)
            if (!visited[i][j])
                return false

    return true
}

// генерация лабиринта
MazeGenerator.prototype.Generate = function(type) {
    let visited = []

    for (let i = 0; i < this.n; i++) {
        visited[i] = []

        for (let j = 0; j < this.m; j++)
            visited[i][j] = false
    }

    let cell = this.GetRandomCell()
    visited[cell.y][cell.x] = true

    while (!this.IsAllVisited(visited)) {
        let directions = this.GetPosibleDirections(cell)
        let direction = this.GetRandomDirection(directions)
        let newCell = this.GetNextCell(cell, direction)

        if (!visited[newCell.y][newCell.x]) {
            visited[newCell.y][newCell.x] = true
            this.SetWallState(cell.x, cell.y, direction, EMPTY_CELL)
        }

        cell = newCell
    }
}

// добавление стен в лабиринт
MazeGenerator.prototype.SetLabitynth = function(labirynth) {
    labirynth.walls = []

    for (let i = 0; i < 2*this.n + 1; i++)
        for (let j = 0; j < 2*this.m + 1; j++)
            if ((i + j) % 2 == 1 && this.matrix[i][j] == WALL_CELL)
                labirynth.AddWall(Math.floor(j / 2), Math.floor(i / 2), i % 2 == 0)
}