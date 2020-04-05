const WALL_CELL = 0 // клетка со стеной
const EMPTY_CELL = 1 // пустая клетка

const LEFT = "left"
const RIGHT = "right"
const UP = "up"
const DOWN = "down"
const DIRECTIONS = [LEFT, RIGHT, UP, DOWN]

const HORIZONTAL = 1
const VERTICAL = 2

// генератор лабиринтов
function MazeGenerator(n, m) {
    this.n = n
    this.m = m
    this.Initialize()

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

// инициализация лабиринта
MazeGenerator.prototype.Initialize = function(state) {
    this.matrix = []

    for (let i = 0; i < 2*this.n + 1; i++) {
        this.matrix[i] = []

        for (let j = 0; j < 2*this.m + 1; j++)
            this.matrix[i][j] = state
    }
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

// генерация идеального лабиринта
MazeGenerator.prototype.GeneratePerfect = function() {
    this.Initialize(WALL_CELL)
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

// получение ориентации "комнаты"
MazeGenerator.prototype.GetOrientation = function(width, height) {
    if (width < height)
        return HORIZONTAL

    if (height < width)
        return VERTICAL

    return Math.random() < 0.5 ? HORIZONTAL : VERTICAL
}

// генерация лабиринта методом рекурсивного деления
MazeGenerator.prototype.RecursiveDivision = function(x, y, width, height) {
    if (width < 2 || height < 2)
        return

    let orientation = this.GetOrientation(width, height)
    let isHorizontal = orientation == HORIZONTAL

    let wx = x + (isHorizontal ? 0 : Math.floor(Math.random() * (width - 2)))
    let wy = y + (isHorizontal ? Math.floor(Math.random() * (height - 2)) : 0)

    let px1 = wx + (isHorizontal ? Math.floor(Math.random() * width) : 0)
    let py1 = wy + (isHorizontal ? 0 : Math.floor(Math.random() * height))

    let px2 = wx + (isHorizontal ? Math.floor(Math.random() * width) : 0)
    let py2 = wy + (isHorizontal ? 0 : Math.floor(Math.random() * height))

    let dx = isHorizontal ? 1 : 0
    let dy = isHorizontal ? 0 : 1

    let length = isHorizontal ? width : height
    let dir = isHorizontal ? DOWN : RIGHT
    let needSecond = Math.random() < (isHorizontal ? width / this.m : height / this.n)

    for (let i = 0; i < length; i++) {
        if (!((wx == px1 && wy == py1) || (needSecond && (wx == px2 && wy == py2))))
            this.SetWallState(wx, wy, dir, WALL_CELL)

        wx += dx
        wy += dy
    }

    let x1 = x
    let y1 = y

    let x2 = isHorizontal ? x : wx + 1
    let y2 = isHorizontal ? wy + 1 : y

    let w1 = isHorizontal ? width : wx - x + 1
    let h1 = isHorizontal ? wy - y + 1 : height

    let w2 = isHorizontal ? width : x + width - wx - 1
    let h2 = isHorizontal ? y + height - wy - 1 : height

    this.RecursiveDivision(x1, y1, w1, h1)
    this.RecursiveDivision(x2, y2, w2, h2)
}

// генерация методом рекурсивного деления
MazeGenerator.prototype.GenerateRecursiveDivision = function() {
    this.Initialize(EMPTY_CELL)
    this.RecursiveDivision(0, 0, this.m, this.n)
}

// генерация лабиринта
MazeGenerator.prototype.Generate = function() {
    let p = Math.random()

    if (p < 0.25) {
        this.GeneratePerfect()
    }
    else {
        this.GenerateRecursiveDivision()
    }
}

// добавление стен в лабиринт
MazeGenerator.prototype.SetLabitynth = function(labirynth) {
    labirynth.walls = []

    for (let i = 1; i < 2*this.n; i++)
        for (let j = 1; j < 2*this.m; j++)
            if ((i + j) % 2 == 1 && this.matrix[i][j] == WALL_CELL)
                labirynth.AddWall(Math.floor(j / 2), Math.floor(i / 2), i % 2 == 0)

    let top = Math.floor(Math.random() * this.n)
    let bottom = Math.floor(Math.random() * this.n)
    let left = Math.floor(Math.random() * this.m)
    let right = Math.floor(Math.random() * this.m)

    for (let i = 0; i < this.n; i++) {
        if (i != top)
            labirynth.AddWall(0, i, false)

        if (i != bottom)
            labirynth.AddWall(this.m, i, false)
    }

    for (let i = 0; i < this.m; i++) {
        if (i != left)
            labirynth.AddWall(i, 0, true)

        if (i != right)
            labirynth.AddWall(i, this.n, true)
    }
}