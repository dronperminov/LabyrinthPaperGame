const PLAY = "PLAY"
const ADD = "ADD"
const REMOVE = "REMOVE"
const GRENADE = "GRENADE"
const WALL = "-" // стена
const ARBALET = "A" // арбалет
const TREASURE = "x" // клад
const BAG = "B" // ложный клад
const TRAP = "K" // капкан
const PIT = "P" // яма
const CRUTCH = "C" // костыль

const BAG_COUNT = 3 // количество ложных кладов
const PIT_COUNT = 4 // количество ям
const GRENADE_COUNT = 3 // количество гранат

const BAD_COLOR = "#f00"
const GOOD_COLOR = "#40bfbf"

const WALL_DEFAULT = 0 // статус обычной стены
const WALL_CLEARED = 1 // статус удалённой стены
const WALL_DESTROYED = 2 // статус разрушенной стены

function Labirynth(canvas, n, m, size, isSecondField, canRemove=false) {
    this.n = n // число строк лабиринта
    this.m = m // число столбцов лабиринта
    this.size = size // размер клетки
    this.canvas = canvas // картинка
    this.ctx = canvas.getContext('2d') // контекст

    this.isSecondField = isSecondField
    this.canRemove = canRemove

    this.letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ"
    this.controlWidth = 50 // ширина отступа для блока управления
    this.delta = 7 // зазор для поиска стен в пикселях

    this.w = this.m * this.size // ширина лабиринта (в пикселях)
    this.h = this.n * this.size // высота лабиринта (в пикселях)
    this.x0 = (this.canvas.width - this.w - this.controlWidth) / 2 // левый верхний угол по горизонтали
    this.y0 = (this.canvas.height - this.h) / 2 // левый верхний угол по вертикали

    this.InitTools()
    this.InitWalls()
    this.InitEvents()

    this.path = []
    this.currentPoint = null
    this.message = ""
    this.messageColor = BAD_COLOR
    this.needDrawWave = true
}

// инициализация инструменов
Labirynth.prototype.InitTools = function() {
    this.tools = [ PLAY, WALL, GRENADE, ARBALET, TREASURE, BAG, TRAP, CRUTCH, PIT ] // набор инструментов
    this.toolsIndexes = []
    this.toolsObjects = []
    this.toolIndex = 0

    if (this.isSecondField) {
        this.tools.splice(1, 0, ADD)

        if (this.canRemove)
            this.tools.splice(2, 0, REMOVE)
    }

    for (let i = 0; i < this.tools.length; i++) {
        this.toolsObjects[i] = []

        if (this.tools[i] == GRENADE)
            for (let j = 0; j < GRENADE_COUNT; j++)
                this.toolsObjects[i].push(j)

        this.toolsIndexes[this.tools[i]] = i
    }

    // параметры блока управления
    this.cx0 = this.x0 + this.w + 15
    this.cy0 = this.y0
    this.cw = this.controlWidth - 10
    this.ch = this.tools.length * this.size

    this.toolsImages = []
    this.toolsImages.push([document.getElementById("play-img"), document.getElementById("play-hover-img")])
    this.toolsImages.push([document.getElementById("wall-img"), document.getElementById("wall-hover-img")])
    this.toolsImages.push([document.getElementById("grenade-img"), document.getElementById("grenade-hover-img")])
    this.toolsImages.push([document.getElementById("arbalet-img"), document.getElementById("arbalet-hover-img")])
    this.toolsImages.push([document.getElementById("treasure-img"), document.getElementById("treasure-hover-img"), document.getElementById("treasure-removed-img")])
    this.toolsImages.push([document.getElementById("bag-img"), document.getElementById("bag-hover-img"), document.getElementById("bag-removed-img")])
    this.toolsImages.push([document.getElementById("trap-img"), document.getElementById("trap-hover-img")])
    this.toolsImages.push([document.getElementById("crutch-img"), document.getElementById("crutch-hover-img")])
    this.toolsImages.push([document.getElementById("pit-img"), document.getElementById("pit-hover-img")])

    if (this.isSecondField) {
        this.toolsImages.splice(1, 0, [document.getElementById("add-img"), document.getElementById("add-hover-img")])

        if (this.canRemove)
            this.toolsImages.splice(2, 0, [document.getElementById("remove-img"), document.getElementById("remove-hover-img")])
    }

    this.isPitStart = false
    this.pitStartImage = document.getElementById("hole-img")
}

// инициализация стен лабиринта
Labirynth.prototype.InitWalls = function() {
    this.walls = [] // массив стен

    if (this.isSecondField)
        return

    for (let i = 0; i < this.n; i++) {
        this.AddWall(0, i, false)
        this.AddWall(this.m, i, false)
    }

    for (let i = 0; i < this.m; i++) {
        this.AddWall(i, 0, true)
        this.AddWall(i, this.n, true)
    }
}

// инициализация обработчиков событий
Labirynth.prototype.InitEvents = function() {
    let labirynth = this
    this.canvas.addEventListener('mousemove', function(e) { labirynth.MouseMove(e) })
    this.canvas.addEventListener('mousedown', function(e) { labirynth.MouseDown(e) })
    this.canvas.addEventListener('mousewheel', function(e) { labirynth.MouseWheel(e) })

    window.addEventListener('keydown', function(e) { labirynth.KeyDown(e) })

    document.addEventListener("mousemove", function(e) {
        if (e.toElement != labirynth.canvas) {
            if (labirynth.currentPoint != null) {
                labirynth.currentPoint = null
                labirynth.Draw()
            }
        }
    })
}

// добавление стены
Labirynth.prototype.AddWall = function(x, y, isHorizontal) {
    this.walls.push({
        x: x,
        y: y,
        isHorizontal: isHorizontal,
        status: WALL_DEFAULT
    })
}

// получение точек заданной стены
Labirynth.prototype.GetWallPoints = function(wall) {
    return {
        x1: wall.x,
        y1: wall.y,
        x2: wall.x + (wall.isHorizontal ? 1 : 0),
        y2: wall.y + (wall.isHorizontal ? 0 : 1)
    }
}

// получение стены в заданной точке
Labirynth.prototype.GetWallByPoint = function(mx, my) {
    let x = (mx - this.x0) / this.size
    let y = (my - this.y0) / this.size
    let delta = this.delta / this.size

    if (x < -delta || y < -delta || x > this.m + delta || y > this.m + delta)
        return null

    let dx = [ -1, 1, 0, 0 ]
    let dy = [ 0, 0, -1, 1 ]

    let index = -1
    let minDst = -1
    let minX = -1
    let minY = -1

    for (let i = 0; i < dx.length; i++) {
        let x1 = Math.round(x)
        let y1 = Math.round(y)
        let x2 = x1 + dx[i]
        let y2 = y1 + dy[i]

        if (x1 > x2) {
            let tmp = x1
            x1 = x2
            x2 = tmp
        }

        if (y1 > y2) {
            let tmp = y1
            y1 = y2
            y2 = tmp
        }

        if (x < x1 - delta || y < y1 - delta || x > x2 + delta || y > y2 + delta || x2 > this.m || y2 > this.n || x1 < 0 || y1 < 0)
            continue

        let dst = i >= 2 ? Math.abs(x - x1) : Math.abs(y - y1)

        if (minDst == -1 || dst < minDst) {
            index = i
            minDst = dst
            minX = x1
            minY = y1
        }
    }

    if (index == -1)
        return null

    return {
        x: minX,
        y: minY,
        isHorizontal: index < 2,
        status: WALL_DEFAULT
    }
}

// получение индекса входа в яму
Labirynth.prototype.GetPitIndex = function(x, y) {
    let pit = this.toolsIndexes[PIT]
    for (let i = 0; i < this.toolsObjects[pit].length; i += 2)
        if (this.toolsObjects[pit][i].x == x && this.toolsObjects[pit][i].y == y)
            return i

    return -1
}

// отрисовка координатных обозначений
Labirynth.prototype.DrawCoordinates = function() {
    this.ctx.font = (this.size / 2) + "px serif"
    this.ctx.fillStyle = "#000"
    this.ctx.textAlign = "right"
    this.ctx.textBaseline = "middle"

    for (let i = 0; i < this.n; i++)
        this.ctx.fillText(i + 1, this.x0 - 5, this.y0 + (i + 0.5) * this.size, 20)

    this.ctx.textAlign = "center"
    for (let i = 0; i < this.m; i++)
        this.ctx.fillText(this.letters[i], this.x0 + (i + 0.5) * this.size, this.y0 - this.size / 3)
}

// отрисовка сетки
Labirynth.prototype.DrawGrid = function() {
    this.ctx.strokeStyle = '#ddd'

    for (let i = 0; i <= this.n; i++) {
        this.ctx.beginPath()
        this.ctx.moveTo(this.x0, this.y0 + i * this.size)
        this.ctx.lineTo(this.x0 + this.w, this.y0 + i * this.size)
        this.ctx.stroke()
    }

    for (let i = 0; i <= this.m; i++) {
        this.ctx.beginPath()
        this.ctx.moveTo(this.x0 + i * this.size, this.y0)
        this.ctx.lineTo(this.x0 + i * this.size, this.y0 + this.h)
        this.ctx.stroke()
    }
}

// отрисовка стен
Labirynth.prototype.DrawWalls = function() {
    this.ctx.lineWidth = 2

    for (let i = 0; i < this.walls.length; i++) {
        let wall = this.walls[i]
        let points = this.GetWallPoints(wall)
        let x1 = this.x0 + points.x1 * this.size
        let x2 = this.x0 + points.x2 * this.size
        let y1 = this.y0 + points.y1 * this.size
        let y2 = this.y0 + points.y2 * this.size

        if (wall.status == WALL_CLEARED) {
            if (wall.isHorizontal) {
                x1 += 1
                x2 -= 1
            }
            else {
                y1 += 1
                y2 -= 1
            }
        }

        this.ctx.beginPath()
        this.ctx.setLineDash([])

        let color = "#000"

        if (wall.status == WALL_CLEARED)
            color = "#fff"
        else if (wall.status == WALL_DESTROYED) {
            this.ctx.setLineDash([2, 4])
        }

        this.ctx.moveTo(x1, y1)
        this.ctx.lineTo(x2, y2)
        this.ctx.strokeStyle = color
        this.ctx.stroke()
    }

    this.ctx.setLineDash([])
}

// отрисовка блока управления
Labirynth.prototype.DrawControls = function() {
    let diff = this.isSecondField ? 1 : 0

    for (let i = 0; i < this.tools.length - diff; i++) {
        x = this.cx0
        y = this.cy0 + i * this.cw

        this.ctx.rect(x, y, this.cw, this.cw)

        if (this.tools[i] == GRENADE) {
            this.ctx.font = (this.size / 2.5) + "px serif"
            this.ctx.textAlign = "right"
            this.ctx.fillStyle = "#000"
            this.ctx.fillText(this.toolsObjects[i].length, x + this.cw - 2, y + this.cw - 8)
            this.ctx.drawImage(this.toolsImages[i][i == this.toolIndex ? 1 : 0], x + 2, y + 2, this.cw - 8, this.cw - 8)
        }
        else {
            this.ctx.drawImage(this.toolsImages[i][i == this.toolIndex ? 1 : 0], x + 2, y + 2, this.cw - 4, this.cw - 4)
        }
    }

    this.ctx.strokeStyle = '#black'
    this.ctx.stroke()
}

// отриосвка объектов
Labirynth.prototype.DrawObjects = function() {
    this.ctx.strokeStyle = "#000"
    this.ctx.lineWidth = 1

    this.ctx.beginPath()
    for (let i = 0; i < this.toolsObjects.length; i++) {
        for (let j = 0; j < this.toolsObjects[i].length; j++) {
            x = this.x0 + this.toolsObjects[i][j].x * this.size
            y = this.y0 + this.toolsObjects[i][j].y * this.size

            if (this.tools[i] == PIT) {
                let id = this.toolsObjects[i][j].id
                this.ctx.font = (this.size / 3) + "px serif"
                this.ctx.textAlign = "right"
                this.ctx.fillText(Math.floor(id / 2) + 1, x + this.size - 2, y + this.size - 8)
                this.ctx.drawImage(id % 2 ? this.toolsImages[i][0] : this.pitStartImage, x + 2, y + 2, this.size - 8, this.size - 8)
            }
            else if (this.tools[i] == BAG || this.tools[i] == TREASURE) {
                let status = this.toolsObjects[i][j].status
                this.ctx.drawImage(this.toolsImages[i][status], x + 2, y + 2, this.size - 4, this.size - 4)
            }
            else {
                this.ctx.drawImage(this.toolsImages[i][0], x + 2, y + 2, this.size - 4, this.size - 4)
            }
        }
    }
}

// отрисовка траектории
Labirynth.prototype.DrawPath = function() {
    let n = this.path.length
    let minRadius = 5
    let maxRadius = this.size / 4
    let dr = maxRadius - minRadius
    let colorLength = 20

    for (let i = 0; i < this.path.length; i++) {
        let x = this.x0 + this.path[i].x * this.size
        let y = this.y0 + this.path[i].y * this.size
        let r = minRadius + dr * (i + 1) / this.path.length
        let red = 255 * (i + 1 + Math.max(0, colorLength - n)) / Math.max(n, colorLength)

        this.ctx.beginPath()

        if (i < this.path.length - 1) {
            this.ctx.arc(x + this.size / 2, y + this.size / 2, r, 0, Math.PI * 2)
            this.ctx.strokeStyle = "rgb(" + red + ", 0, 0)"
            this.ctx.stroke()
        }
        else {
            this.ctx.font = (this.size / 2) + "px serif"
            this.ctx.textAlign = "center"
            this.ctx.fillStyle = "#f00"
            this.ctx.fillText("✖", x + this.size / 2, y + this.size / 2)
        }
    }

    if (n > 0) {
        let x = this.path[n - 1].x
        let y = this.path[n - 1].y

        this.ctx.font = (this.size / 2) + "px serif"
        this.ctx.fillStyle = "#f00"
        this.ctx.textAlign = "center"
        this.ctx.fillText(this.letters[x] + (y + 1), this.cx0 + this.cw / 2, this.cy0 + this.h - this.size / 2)
    }

    this.ctx.beginPath()
}

// отрисовка сообщения
Labirynth.prototype.DrawMessage = function() {
    this.ctx.beginPath()
    this.ctx.fillStyle = this.messageColor
    this.ctx.font = (this.size / 3) + "px serif"
    this.ctx.textAlign = "center"
    this.ctx.fillText(this.message, this.canvas.width / 2, this.y0 + this.h + 10)
}

// отрисовка лабиринта
Labirynth.prototype.Draw = function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.DrawCoordinates()
    this.DrawGrid()
    this.DrawWave()
    this.DrawWalls()
    this.DrawObjects()
    this.DrawControls()
    this.DrawPath()
    this.DrawMessage()
}

// удаление дыры
Labirynth.prototype.RemovePit = function(j) {
    let i = this.toolsIndexes[PIT]

    if (j % 2)
        j--

    this.toolsObjects[i].splice(j, 2)

    for (let j = 0; j < this.toolsObjects[i].length; j++)
        this.toolsObjects[i][j].id = j
}

// удаление объекта интсрумента
Labirynth.prototype.RemoveTool = function(x, y) {
    for (let i = 0; i < this.toolsObjects.length; i++) {
        for (let j = 0; j < this.toolsObjects[i].length; j++) {
            if (this.toolsObjects[i][j].x == x && this.toolsObjects[i][j].y == y) {
                if (this.tools[i] == PIT && !this.isSecondField) {
                    this.RemovePit(j)
                }
                else {
                    this.toolsObjects[i].splice(j, 1)
                }
                return
            }
        }
    }
}

// проверка наличия не очищенных стен кроме границ
Labirynth.prototype.HaveInnerWalls = function() {
    for (let i = 0; i < this.walls.length; i++) {
        if (this.walls[i].status != WALL_DEFAULT)
            continue

        if (this.walls[i].isHorizontal) {
            if (this.walls[i].y > 0 && this.walls[i].y < this.n)
                return true
        }
        else {
            if (this.walls[i].x > 0 && this.walls[i].x < this.m)
                return true
        }
    }

    return false
}

Labirynth.prototype.HaveActivatedTreasure = function() {
    let treasures = this.toolsObjects[this.toolsIndexes[TREASURE]]

    for (let i = 0; i < treasures.length; i++)
        if (treasures[i].status == 1)
            return true

    let bags = this.toolsObjects[this.toolsIndexes[BAG]]

    for (let i = 0; i < bags.length; i++)
        if (bags[i].status == 1)
            return true

    return false
}

// активация / деактивация клада
Labirynth.prototype.ActivateTreasure = function(ix, iy) {
    let treasures = this.toolsObjects[this.toolsIndexes[TREASURE]]
    let bags = this.toolsObjects[this.toolsIndexes[BAG]]
    let haveActivated = this.HaveActivatedTreasure()

    for (let i = 0; i < treasures.length; i++) {
        if (treasures[i].x == ix && treasures[i].y == iy) {
            if (!haveActivated || treasures[i].status != 0)
                treasures[i].status = (treasures[i].status + 1) % 3;
            return
        }
    }

    for (let i = 0; i < bags.length; i++) {
        if (bags[i].x == ix && bags[i].y == iy) {
            if (!haveActivated || bags[i].status != 0)
                bags[i].status = (bags[i].status + 1) % 3;
            return
        }
    }
}

// проверка клетки на свободу
Labirynth.prototype.IsCellEmpty = function(x, y) {
    for (let i = 0; i < this.toolsObjects.length; i++)
        for (let j = 0; j < this.toolsObjects[i].length; j++)
            if (this.toolsObjects[i][j].x == x && this.toolsObjects[i][j].y == y)
                return false

    return true
}

// проверка, что курсор мыши внутри самого лабиринта
Labirynth.prototype.IsMouseInMaze = function(mx, my, delta=0) {
    if (mx < this.x0 - delta || mx >= this.x0 + this.w + delta)
        return false

    if (my < this.y0 - delta || my >= this.y0 + this.h + delta)
        return false

    return true
}

// проверка, что курсор мыши внутри блока управления
Labirynth.prototype.IsMouseInControls = function(mx, my) {
    if (mx < this.cx0 || mx >= this.cx0 + this.cw)
        return false

    if (my < this.cy0 || my >= this.cy0 + this.ch)
        return false

    return true
}

// проверка возможности использования инструмента
Labirynth.prototype.CanUseTool = function(index) {
    if (this.tools[index] == PIT && this.toolsObjects[index].length == PIT_COUNT * 2) // если хотим выбрать дыру, а они уже все есть
        return false

    if (this.tools[index] != PIT && this.isPitStart)
        return false // не даём менять управление, если не поставили вторую дыру

    if (this.tools[index] == BAG && this.toolsObjects[index].length < BAG_COUNT)
        return true

    if (this.tools[index] == GRENADE)
        return this.toolsObjects[index].length > 0 && this.HaveInnerWalls()

    if (this.tools[index] != PIT && this.toolsObjects[index].length > 0)
        return false

    if (this.tools[index] == PIT && this.isSecondField)
        return false

    if (this.tools[index] == ADD || this.tools[index] == REMOVE)
        return false

    return true
}

// получение индекса стены
Labirynth.prototype.GetWallIndex = function(wall) {
    for (let i = 0; i < this.walls.length; i++)
        if (wall.x == this.walls[i].x && wall.y == this.walls[i].y && wall.isHorizontal == this.walls[i].isHorizontal)
            return i

    return -1
}

// получение координат выходов
Labirynth.prototype.GetQuits = function() {
    let quits = []

    let left = []
    let right = []
    let top = []
    let bottom = []

    for (let i = 0; i < this.n; i++) {
        left[i] = false
        right[i] = false
    }

    for (let i = 0; i < this.m; i++) {
        top[i] = false
        bottom[i] = false
    }

    for (let i = 0; i < this.walls.length; i++) {
        if (this.walls[i].status != WALL_DEFAULT)
            continue

        if (this.walls[i].isHorizontal) {
            if (this.walls[i].y == 0)
                top[this.walls[i].x] = true

            if (this.walls[i].y == this.n)
                bottom[this.walls[i].x] = true
        }
        else {
            if (this.walls[i].x == 0)
                left[this.walls[i].y] = true

            if (this.walls[i].x == this.m)
                right[this.walls[i].y] = true
        }
    }

    for (let i = 0; i < this.n; i++) {
        if (!left[i])
            quits.push({ x: 0, y: i })

        if (!right[i])
            quits.push({ x: this.m - 1, y: i })
    }

    for (let i = 0; i < this.m; i++) {
        if (!top[i])
            quits.push({ x: i, y: 0 })

        if (!bottom[i])
            quits.push({ x: i, y: this.n - 1 })
    }

    return quits
}

// распространение волны из заданной точки
Labirynth.prototype.MakeWave = function(startX, startY) {
    let n = this.n * this.m
    let matrix = []

    for (let i = 0; i < this.n; i++) {
        matrix[i] = []

        for (let j = 0; j < this.m; j++)
            matrix[i][j] = -1
    }

    matrix[startY][startX] = 0
    let stop = false
    let d = 0

    for (d = 0; !stop; d++) {
        stop = true

        for (let x = 0; x < this.m; x++) {
            for (let y = 0; y < this.n; y++) {
                if (matrix[y][x] != d)
                    continue

                let dirX = [ -1, 1, 0, 0 ]
                let dirY = [ 0, 0, -1, 1 ]

                let pitIndex = this.GetPitIndex(x, y)

                if (pitIndex > -1) {
                    let pits = this.toolsObjects[this.toolsIndexes[PIT]]

                    if (pitIndex + 1 < pits.length) {
                        let pit = pits[pitIndex + 1]
                        dirX.push(pit.x - x)
                        dirY.push(pit.y - y)
                    }
                }

                for (let k = 0; k < dirX.length; k++) {
                    let x2 = x + dirX[k]
                    let y2 = y + dirY[k]

                    if (x2 < 0 || y2 < 0 || x2 >= this.m || y2 >= this.n || matrix[y2][x2] != -1)
                        continue

                    if (!this.HaveWall(x, y, dirX[k], dirY[k])) {
                        matrix[y2][x2] = d + 1
                        stop = false
                    }
                }
            }
        }
    }

    return { matrix: matrix, d: d }
}

// обработка выходов
Labirynth.prototype.ProcessQuits = function(quits) {
    if (quits.length < 4) {
        this.message = "Недостаточно выходов (" + quits.length + ")"
        this.messageColor = BAD_COLOR
        return false
    }

    if (quits.length > 4) {
        this.message = "Слишком много выходов (" + quits.length + ")"
        this.messageColor = BAD_COLOR
        return false
    }

    let sides = [ 0, 0, 0, 0]

    for (let i = 0; i < quits.length; i++) {
        if (quits[i].x == 0)
            sides[0]++
        else if (quits[i].x == this.m - 1)
            sides[1]++
        else if (quits[i].y == 0)
            sides[2]++
        else if (quits[i].y == this.n - 1)
            sides[3]++
    }

    for (let i = 0; i < 4; i++) {
        if (sides[i] != 1) {
            this.message = "Выходы расставлены некорректно"
            this.messageColor = BAD_COLOR
            return false
        }
    }

    return true
}

// отрисовка распространения волны
Labirynth.prototype.DrawWave = function() {
    if (this.isSecondField || !this.needDrawWave)
        return

    let quits = this.GetQuits()

    if (!this.ProcessQuits(quits))
        return

    let pits = this.toolsObjects[this.toolsIndexes[PIT]]
    let pitQuits = []

    for (let i = 1; i < pits.length; i += 2)
        pitQuits.push({ x: pits[i].x, y: pits[i].y })

    this.message = ""

    let res = this.MakeWave(quits[0].x, quits[0].y)
    let matrix = res.matrix
    let haveUnreachable = false

    for (let i = 1; i < quits.length; i++) {
        res = this.MakeWave(quits[i].x, quits[i].y)

        for (let x = 0; x < this.m; x++) {
            for (let y = 0; y < this.n; y++) {
                if (res.matrix[y][x] == -1) {
                    matrix[y][x] = res.matrix[y][x]
                    haveUnreachable = true;
                }
            }
        }

    }

    if (!haveUnreachable) {
        for (let i = 0; i < pitQuits.length; i++) {
            res = this.MakeWave(pitQuits[i].x, pitQuits[i].y)

            for (let x = 0; x < this.m; x++) {
                for (let y = 0; y < this.n; y++) {
                    if (res.matrix[y][x] == -1) {
                        matrix[y][x] = res.matrix[y][x]
                        haveUnreachable = true;
                    }
                }
            }

        }
    }

    for (let i = 0; i < this.n; i++) {
        for (let j = 0; j < this.m; j++) {
            if (matrix[i][j] != -1)
                continue

            haveUnreachable = true
            let x = this.x0 + j * this.size
            let y = this.y0 + i * this.size
            this.ctx.fillStyle = "#ddd"
            this.ctx.fillRect(x, y, this.size, this.size)
        }
    }

    if (haveUnreachable) {
        this.message = "Есть недостижимые клетки"
        this.messageColor = BAD_COLOR
    }
}

// обработка перемещения мыши во время режима "WALL"
Labirynth.prototype.WallToolMouseMove = function(mx, my) {
    let wall = this.GetWallByPoint(mx, my)

    if (wall == null)
        return

    let index = this.GetWallIndex(wall)

    if (index > -1 && this.walls[index].status == WALL_DESTROYED)
        return

    let points = this.GetWallPoints(wall)

    this.ctx.strokeStyle = "#f88"
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(this.x0 + points.x1 * this.size, this.y0 + points.y1 * this.size)
    this.ctx.lineTo(this.x0 + points.x2 * this.size, this.y0 + points.y2 * this.size)
    this.ctx.stroke()
    this.ctx.lineWidth = 1
}

// обработка перемещения мыши в режиме "PLAY"
Labirynth.prototype.PlayToolMouseMove = function(ix, iy) {
    let x = this.x0 + ix * this.size
    let y = this.y0 + iy * this.size

    this.canvas.style.cursor = "pointer"
    this.ctx.beginPath()
    this.ctx.arc(x + this.size / 2, y + this.size / 2, this.size / 4, 0, Math.PI * 2)
    this.ctx.strokeStyle = "#f00"
    this.ctx.stroke()
    this.currentPoint = { x: ix, y: iy }

    this.ctx.clearRect(this.cx0, this.cy0 + this.h - this.size + 1, this.size, this.size)
    this.ctx.font = (this.size / 2) + "px serif"
    this.ctx.fillStyle = "#000"
    this.ctx.textAlign = "center"
    this.ctx.fillText(this.letters[ix] + (iy + 1), this.cx0 + this.cw / 2, this.cy0 + this.h - this.size / 2)
}

// обработка перемещения мыши в режиме "GRENADE"
Labirynth.prototype.GrenadeToolMouseMove = function(mx, my) {
    if (mx <= this.x0 + this.delta || mx >= this.x0 + this.w - this.delta)
        return

    if (my <= this.y0 + this.delta || my >= this.y0 + this.h - this.delta)
        return

    let wall = this.GetWallByPoint(mx, my)

    if (wall == null)
        return

    let index = this.GetWallIndex(wall)

    if (index == -1 || this.walls[index].status != WALL_DEFAULT)
        return

    let points = this.GetWallPoints(wall)

    let ix = wall.isHorizontal ? points.x1 : (points.x1 + points.x2 - 1) / 2
    let iy = wall.isHorizontal ? (points.y1 + points.y2 - 1) / 2 : points.y1

    let x = this.x0 + ix * this.size
    let y = this.y0 + iy * this.size
    let img = this.toolsImages[this.toolIndex][0]

    this.ctx.drawImage(img, x + 2, y + 2, this.size - 4, this.size - 4)
    this.canvas.style.cursor = "pointer"
}

// обработка перемещения мыши в остальных режимах
Labirynth.prototype.OtherToolMouseMove = function(ix, iy) {
    if (!this.IsCellEmpty(ix, iy))
            return

    let x = this.x0 + ix * this.size
    let y = this.y0 + iy * this.size
    let img;

    if (this.tools[this.toolIndex] == PIT && !this.isPitStart)
        img = this.pitStartImage
    else
        img = this.toolsImages[this.toolIndex][0]

    this.ctx.drawImage(img, x + 2, y + 2, this.size - 4, this.size - 4)
}

// обработка перемещения мыши внутри лабиринта
Labirynth.prototype.MazeMouseMove = function(mx, my) {
    if (this.tools[this.toolIndex] == WALL) {
        this.WallToolMouseMove(mx, my)
        return
    }

    if (!this.IsMouseInMaze(mx, my))
        return

    let ix = Math.floor((mx - this.x0) / this.size)
    let iy = Math.floor((my - this.y0) / this.size)

    if (this.tools[this.toolIndex] == PLAY) {
        this.PlayToolMouseMove(ix, iy)
    }
    else if (this.tools[this.toolIndex] == GRENADE) {
        this.GrenadeToolMouseMove(mx, my)
    }
    else {
        this.OtherToolMouseMove(ix, iy)
    }
}

// обработка перемещения мыши внутри блока управления
Labirynth.prototype.ControlsMouseMove = function(mx, my) {
    let index = Math.floor((my - this.cy0) / this.cw)

    if (this.tools[index] == ADD || this.tools[index] == REMOVE) {
        this.canvas.style.cursor = "pointer"
        this.ctx.drawImage(this.toolsImages[index][1], this.cx0 + 2, this.cy0 + index * this.cw + 2, this.cw - 4, this.cw - 4)
        return
    }

    if (index == this.toolIndex || !this.CanUseTool(index))
        return

    if (this.tools[index] == GRENADE) {
        this.ctx.drawImage(this.toolsImages[index][1], this.cx0 + 2, this.cy0 + index * this.cw + 2, this.cw - 8, this.cw - 8)
    }
    else {
        this.ctx.drawImage(this.toolsImages[index][1], this.cx0 + 2, this.cy0 + index * this.cw + 2, this.cw - 4, this.cw - 4)
    }

    this.canvas.style.cursor = "pointer"
}

// работа инструмента "СТЕНА"
Labirynth.prototype.WallToolMouseClick = function(mx, my, button) {
    let wall = this.GetWallByPoint(mx, my)

    if (wall == null) {
        let ix = Math.floor((mx - this.x0) / this.size)
        let iy = Math.floor((my - this.y0) / this.size)

        if (button == 2) {
            this.RemoveTool(ix, iy)
        }
        else {
            this.ActivateTreasure(ix, iy)
        }
        return
    }

    let index = this.GetWallIndex(wall)

    if (index == -1) {
        wall.status = button == 2 ? WALL_CLEARED : WALL_DEFAULT
        this.walls.push(wall)
        return
    }

    if (this.walls[index].status == WALL_DESTROYED)
        return

    if (button == 2 && this.walls[index].status == WALL_CLEARED || button == 0 && this.walls[index].status == WALL_DEFAULT) {
        this.walls.splice(index, 1)
    }
    else {
        this.walls[index].status = this.walls[index].status == WALL_CLEARED ? WALL_DEFAULT : WALL_CLEARED
    }
}

// очистка стены в заданной точке поля
Labirynth.prototype.SetWallState = function(ix, iy, isCleared) {
    let mx = this.x0 + ix * this.size
    let my = this.y0 + iy * this.size
    let wall = this.GetWallByPoint(mx, my)

    if (wall == null)
        return

    let index = this.GetWallIndex(wall)

    if (index > -1) {
        this.walls[index].status = isCleared ? WALL_CLEARED : WALL_DEFAULT
    }
    else {
        wall.status = isCleared ? WALL_CLEARED : WALL_DEFAULT
        this.walls.push(wall)
    }
}

// обработка ямы на первом поле
Labirynth.prototype.PitProcessingFirstField = function(ix, iy) {
    let pits = this.toolsObjects[this.toolsIndexes[PIT]]

    for (let i = 0; i < pits.length; i += 2) {
        if (pits[i].x == ix && pits[i].y == iy) {
            ix = pits[i + 1].x
            iy = pits[i + 1].y

            this.path.push({x: ix, y: iy })
            this.MakeMessage("Вы попали в яму №" + (Math.floor(pits[i].id / 2) + 1))
            return true
        }
    }

    return false
}

// обработка ямы на втором поле
Labirynth.prototype.PitProcessingSecondField = function(ix, iy) {
    let pits = this.toolsObjects[this.toolsIndexes[PIT]]
    let id = -1

    for (let i = 0; i < pits.length; i++) {
        if (pits[i].x == ix && pits[i].y == iy && pits[i].id % 2 == 0) {
            id = pits[i].id
            break
        }
    }

    if (id == -1)
        return false

    for (let i = 0; i < pits.length; i++) {
        if (pits[i].id == id + 1) {
            ix = pits[i].x
            iy = pits[i].y

            this.path.push({x: ix, y: iy })
        }
    }

    return true
}

// обработка объектов
Labirynth.prototype.ObjectsProcessing = function(ix, iy) {
    let isPit;

    if (this.isSecondField) {
        isPit = this.PitProcessingSecondField(ix, iy)
    }
    else {
        isPit = this.PitProcessingFirstField(ix, iy)
    }

    if (isPit)
        return

    for (let i = 0; i < this.tools.length; i++) {
        let objects = this.toolsObjects[i]

        for (let j = 0; j < objects.length; j++) {
            if (objects[j].x == ix && objects[j].y == iy) {
                let message = ""
                let color = BAD_COLOR

                if ((this.tools[i] == BAG || this.tools[i] == TREASURE) && objects[j].status == 0) {
                    message = "Вы нашли клад"
                    color = GOOD_COLOR
                }
                else if (this.tools[i] == ARBALET) {
                    message = "Вы наткнулись на арбалет"
                }
                else if (this.tools[i] == CRUTCH) {
                    message = "Вы нашли костыль"
                    color = GOOD_COLOR
                }
                else if (this.tools[i] == TRAP) {
                    message = "Вы попали в капкан"
                }
                else if (this.tools[i] == PIT && objects[j].id % 2) {
                    message = "Вы попали на выход ямы №" + Math.floor(objects[j].id / 2 + 1)
                }

                if (message != "")
                    this.MakeMessage(message, color)
                return
            }
        }
    }
}

// выполнение хода
Labirynth.prototype.PlayToolMakeMove = function(ix, iy) {
    if (this.path.length == 0) {
        this.path.push({ x: ix, y: iy })
        this.ObjectsProcessing(ix, iy)
        return
    }

    let last = this.path.length - 1
    let lastX = this.path[last].x
    let lastY = this.path[last].y

    if (ix == lastX && iy == lastY) // если ставим в ту же точку
        return // то ничего не меняем

    this.path.push({ x: ix, y: iy })
    this.ObjectsProcessing(ix, iy)

    if (!this.isSecondField) // не удаляем стены на первом поле
        return

    if (ix - lastX == 0) {
        this.SetWallState(ix + 0.5, (iy + lastY + 1) / 2, true); // удаляем вертикальную стену
    }
    else if (iy - lastY == 0) {
        this.SetWallState((ix + lastX + 1) / 2, iy + 0.5, true); // удаляем горизонтальную стену
    }
}

// работа инструмента "ИГРА"
Labirynth.prototype.PlayToolMouseClick = function(ix, iy, button) {
    if (button == 0) {
        this.MakeMessage("")
        this.PlayToolMakeMove(ix, iy)
        return
    }

    for (let i = this.path.length - 1; i >= 0; i--)
        if (this.path[i].x == ix && this.path[i].y == iy) {
            this.path.splice(i, 1)
            return
        }
}

// работа инструмента "ГРАНАТА"
Labirynth.prototype.GrenadeToolMouseClick = function(mx, my) {
    if (mx <= this.x0 + this.delta || mx >= this.x0 + this.w - this.delta)
        return

    if (my <= this.y0 + this.delta || my >= this.y0 + this.h - this.delta)
        return

    let wall = this.GetWallByPoint(mx, my)

    if (wall == null)
        return

    let index = this.GetWallIndex(wall)

    if (index == -1 || this.walls[index].status != WALL_DEFAULT)
        return

    this.walls[index].status = WALL_DESTROYED
    this.toolsObjects[this.toolsIndexes[GRENADE]].pop()
}

// работа инструмента "ДЫРА"
Labirynth.prototype.PitToolMouseClick = function(ix, iy, button) {
    if (!this.IsCellEmpty(ix, iy) || button != 0)
        return

    if (!this.isPitStart) {
        this.isPitStart = true
    }
    else {
        this.isPitStart = false
    }

    let count = this.toolsObjects[this.toolIndex].length
    this.toolsObjects[this.toolIndex].push({ x: ix, y: iy, id: count })
}

// работа инструментов кроме дыры
Labirynth.prototype.OtherToolMouseClick = function(ix, iy, button) {
    if (button == 2) {
        this.RemoveTool(ix, iy)
        return
    }

    if (!this.IsCellEmpty(ix, iy))
            return

    if (this.tools[this.toolIndex] == TREASURE || this.tools[this.toolIndex] == BAG)
        this.toolsObjects[this.toolIndex].push({ x: ix, y: iy, status: 0 })
    else
        this.toolsObjects[this.toolIndex].push({ x: ix, y: iy })
}

// клик мыши по клетки лабиринта
Labirynth.prototype.MazeMouseClick = function(mx, my, btn) {
    if (this.tools[this.toolIndex] == WALL) {
        this.WallToolMouseClick(mx, my, btn)
        return
    }

    if (!this.IsMouseInMaze(mx, my))
        return

    let ix = Math.floor((mx - this.x0) / this.size)
    let iy = Math.floor((my - this.y0) / this.size)

    if (this.tools[this.toolIndex] == PLAY) {
        this.PlayToolMouseClick(ix, iy, btn)
    }
    else if (this.tools[this.toolIndex] == GRENADE) {
        this.GrenadeToolMouseClick(mx, my)
    }
    else if (this.tools[this.toolIndex] == PIT) {
        this.PitToolMouseClick(ix, iy, btn)
    }
    else {
        this.OtherToolMouseClick(ix, iy, btn)
    }

    // ищем следующий доступный инструмент
    while (!this.CanUseTool(this.toolIndex))
        this.toolIndex = (this.toolIndex + 1) % this.tools.length
}

// клик мыши по инструменту
Labirynth.prototype.ControlsMouseClick = function(mx, my) {
    let index = Math.floor((my - this.cy0) / this.cw)

    if (this.CanUseTool(index)) {
        this.toolIndex = index
    }
    else if (this.tools[index] == ADD) {
        if (confirm("Вы точно хотите добавить новое поле?"))
            this.AddNewLabirynth()
    }
    else if (this.tools[index] == REMOVE) {
        if (confirm("Вы точно хотите удалить это поле (" + this.n + "x" + this.m + ")?"))
            this.RemoveLabyrinth()
    }
}

// перемещение мыши
Labirynth.prototype.MouseMove = function(e) {
    let x = e.offsetX
    let y = e.offsetY

    this.currentPoint = null
    this.canvas.style.cursor = "default"
    this.Draw()

    if (this.IsMouseInMaze(x, y, this.delta))
        this.MazeMouseMove(x, y)
    else if (this.IsMouseInControls(x, y))
        this.ControlsMouseMove(x, y)
}

// нажатие кнопки мыши
Labirynth.prototype.MouseDown = function(e) {
    let x = e.offsetX
    let y = e.offsetY

    if (this.IsMouseInMaze(x, y, this.delta))
        this.MazeMouseClick(x, y, e.button)
    else if (this.IsMouseInControls(x, y))
        this.ControlsMouseClick(x, y)

    this.Draw()
}

// добавление нового лабиринта
Labirynth.prototype.AddNewLabirynth = function() {
    let n = this.canRemove ? this.n : this.n * 2 - 1
    let m = this.canRemove ? this.m : this.m * 2 - 1

    let canvas = document.createElement("canvas")
    canvas.width = m * this.size + 100
    canvas.height = n * this.size + 50

    document.body.appendChild(canvas)

    let labyrinth = new Labirynth(canvas, n, m, this.size, true, true)
    labyrinth.toolIndex = 0
    labyrinth.path.push({ x: Math.floor(n / 2), y: Math.floor(m / 2) })
    labyrinth.Draw()
}

// удаление лабиринта
Labirynth.prototype.RemoveLabyrinth = function() {
    document.body.removeChild(this.canvas)
    this.MouseDown = function(e) {}
    this.MouseMove = function(e) {}
    this.KeyDown = function(e) {}
}

// проверка наличия стены для хода (x->x+dx, y->y+dy)
Labirynth.prototype.HaveWall = function(x, y, dx, dy) {
    let mx = this.x0 + (x + 0.5 + dx / 2) * this.size
    let my = this.y0 + (y + 0.5 + dy / 2) * this.size

    let wall = this.GetWallByPoint(mx, my)

    if (wall == null)
        return false

    let index = this.GetWallIndex(wall)
    return index > -1 && this.walls[index].status == WALL_DEFAULT
}

// отображение сообщения
Labirynth.prototype.MakeMessage = function(msg, color) {
    this.message = msg
    this.messageColor = color
    this.Draw()
}

// ыполнение хода стрелками
Labirynth.prototype.MakeMove = function(direction) {
    if (this.path.length == 0)
        return

    let last = this.path.length - 1
    let x = this.path[last].x
    let y = this.path[last].y
    let dx = 0
    let dy = 0
    let name = "";
    this.needDrawWave = false

    if (direction == "ArrowUp" || direction == "KeyW") {
        dy = -1
        name = "Вверх"
    }
    else if (direction == "ArrowDown" || direction == "KeyS") {
        dy = 1
        name = "Вниз"
    }
    else if (direction == "ArrowLeft" || direction == "KeyA") {
        dx = -1
        name = "Влево"
    }
    else if (direction == "ArrowRight" || direction == "KeyD") {
        dx = 1
        name = "Вправо"
    }

    let haveWall = this.HaveWall(x, y, dx, dy)
    this.message = name + " можно"
    this.messageColor = GOOD_COLOR

    if (x + dx < 0 || x + dx >= this.m || y + dy < 0 || y + dy >= this.n) {
        if (haveWall)
            this.MakeMessage(name + " нельзя, граница лабиринта!")
        else
            this.MakeMessage(name + " можно, это выход из лабиринта!", GOOD_COLOR)

        this.needDrawWave = true
        return
    }

    if (haveWall) {
        this.MakeMessage(name + " нельзя, там стена!")
        this.needDrawWave = true
        return
    }

    this.PlayToolMakeMove(x + dx, y + dy)
    this.Draw()
    this.needDrawWave = true
}

// обработка нажатия клавиши
Labirynth.prototype.KeyDown = function(e) {
    if (!this.isSecondField) {
        if (["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight", "KeyA", "KeyS", "KeyW", "KeyD"].indexOf(e.code) > -1) {
            this.MakeMove(e.code)
            e.preventDefault()
        }

        return
    }

    if (this.tools[this.toolIndex] != PLAY || this.currentPoint == null)
        return

    if (e.code.substr(0, 5) == "Digit") {
        let key = (+e.code.substr(5) - 1) * 2

        if (e.shiftKey)
            key++

        if (!this.IsCellEmpty(this.currentPoint.x, this.currentPoint.y)) // если клетка уже занята
            return // то выходим

        if (key >= PIT_COUNT * 2) // если такой ямы нет
            return // выходим

        let pit = this.toolsIndexes[PIT]

        for (let i = 0; i < this.toolsObjects[pit].length; i++)
            if (this.toolsObjects[pit][i].id == key) // если эта яма уже есть
                return // то выходим

        this.toolsObjects[pit].push({ x: this.currentPoint.x, y: this.currentPoint.y, id: key }) // иначе добавляем яму
    }

    this.Draw()
}

// обработка прокрутки колеса мыши
Labirynth.prototype.MouseWheel = function(e) {
    let direction = e.deltaY > 0 ? 1 : -1

    do {
        this.toolIndex = (this.toolIndex + this.tools.length + direction) % this.tools.length
    } while (!this.CanUseTool(this.toolIndex))

    this.MouseMove(e)
    e.preventDefault()
}