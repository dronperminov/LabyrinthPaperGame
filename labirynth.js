const PLAY = "PLAY"
const ADD = "ADD"
const REMOVE = "REMOVE"
const WALL = "-" // стена
const ARBALET = "A" // арбалет
const TREASURE = "x" // клад
const BAG = "B" // ложный клад
const TRAP = "K" // капкан
const PIT = "P" // яма
const CRUTCH = "C" // костыль

const BAG_COUNT = 3 // количество ложных кладов
const PIT_COUNT = 4 // количество ям

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
}

// инициализация инструменов
Labirynth.prototype.InitTools = function() {
    this.tools = [ PLAY, WALL, ARBALET, TREASURE, BAG, TRAP, CRUTCH, PIT ] // набор инструментов
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
    this.toolsImages.push([document.getElementById("arbalet-img"), document.getElementById("arbalet-hover-img")])
    this.toolsImages.push([document.getElementById("treasure-img"), document.getElementById("treasure-hover-img")])
    this.toolsImages.push([document.getElementById("bag-img"), document.getElementById("bag-hover-img")])
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
        isCleared: false
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
        isCleared: false
    }
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
        let points = this.GetWallPoints(this.walls[i])
        let x1 = this.x0 + points.x1 * this.size
        let x2 = this.x0 + points.x2 * this.size
        let y1 = this.y0 + points.y1 * this.size
        let y2 = this.y0 + points.y2 * this.size


        if (this.walls[i].isCleared) {
            if (this.walls[i].isHorizontal) {
                x1 += 1
                x2 -= 1
            }
            else {
                y1 += 1
                y2 -= 1
            }
        }

        this.ctx.beginPath()
        this.ctx.moveTo(x1, y1)
        this.ctx.lineTo(x2, y2)
        this.ctx.strokeStyle = this.walls[i].isCleared ? "#fff" : "#000"
        this.ctx.stroke()
    }
}

// отрисовка блока управления
Labirynth.prototype.DrawControls = function() {
    let diff = this.isSecondField ? 1 : 0

    for (let i = 0; i < this.tools.length - diff; i++) {
        x = this.cx0
        y = this.cy0 + i * this.cw

        this.ctx.rect(x, y, this.cw, this.cw)
        this.ctx.drawImage(this.toolsImages[i][i == this.toolIndex ? 1 : 0], x + 2, y + 2, this.cw - 4, this.cw - 4)
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
}

// отрисовка лабиринта
Labirynth.prototype.Draw = function() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.DrawCoordinates()
    this.DrawGrid()
    this.DrawWalls()
    this.DrawObjects()
    this.DrawControls()
    this.DrawPath()
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

// обработка перемещения мыши во время режима "WALL"
Labirynth.prototype.WallToolMouseMove = function(mx, my) {
    let wall = this.GetWallByPoint(mx, my)

    if (wall == null)
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

    this.ctx.beginPath()
    this.ctx.arc(x + this.size / 2, y + this.size / 2, this.size / 4, 0, Math.PI * 2)
    this.ctx.fillStyle = "#f00"
    this.ctx.fill()
    this.currentPoint = { x: ix, y: iy }

    this.ctx.font = (this.size / 2) + "px serif"
    this.ctx.fillStyle = "#000"
    this.ctx.textAlign = "center"
    this.ctx.fillText(this.letters[ix] + (iy + 1), this.cx0 + this.cw / 2, this.cy0 + this.h - this.size / 2)
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

    this.ctx.drawImage(this.toolsImages[index][1], this.cx0 + 2, this.cy0 + index * this.cw + 2, this.cw - 4, this.cw - 4)
    this.canvas.style.cursor = "pointer"
}

// работа инструмента "СТЕНА"
Labirynth.prototype.WallToolMouseClick = function(mx, my, button) {
    let wall = this.GetWallByPoint(mx, my)

    if (wall == null) {
        let ix = Math.floor((mx - this.x0) / this.size)
        let iy = Math.floor((my - this.y0) / this.size)

        if (button == 2)
            this.RemoveTool(ix, iy)
        return
    }

    let index = this.GetWallIndex(wall)

    if (index == -1) {
        wall.isCleared = button == 2
        this.walls.push(wall)
    }
    else {
        if (button == 2 && this.walls[index].isCleared || button == 0 && !this.walls[index].isCleared) {
            this.walls.splice(index, 1)
        }
        else {
            this.walls[index].isCleared = !this.walls[index].isCleared
        }
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
        this.walls[index].isCleared = isCleared
    }
    else {
        wall.isCleared = isCleared
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
            return
        }
    }
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
        return

    for (let i = 0; i < pits.length; i++) {
        if (pits[i].id == id + 1) {
            ix = pits[i].x
            iy = pits[i].y

            this.path.push({x: ix, y: iy })
        }
    }
}

// обработка ям
Labirynth.prototype.PitProcessing = function(ix, iy) {
    if (this.isSecondField) {
        this.PitProcessingSecondField(ix, iy)
    }
    else {
        this.PitProcessingFirstField(ix, iy)
    }
}

// выполнение хода
Labirynth.prototype.PlayToolMakeMove = function(ix, iy) {
    if (this.path.length == 0) {
        this.path.push({ x: ix, y: iy })
        this.PitProcessing(ix, iy)
        return
    }

    let last = this.path.length - 1
    let lastX = this.path[last].x
    let lastY = this.path[last].y

    if (ix == lastX && iy == lastY) // если ставим в ту же точку
        return // то ничего не меняем

    this.path.push({ x: ix, y: iy })
    this.PitProcessing(ix, iy)

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
        this.PlayToolMakeMove(ix, iy)
        return
    }

    for (let i = this.path.length - 1; i >= 0; i--)
        if (this.path[i].x == ix && this.path[i].y == iy) {
            this.path.splice(i, 1)
            return
        }
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
    return wall != null && this.GetWallIndex(wall) > -1
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

    if (direction == "Up" && y > 0) {
        dy = -1
    }
    else if (direction == "Down" && y < this.n - 1) {
        dy = 1
    }
    else if (direction == "Left" && x > 0) {
        dx = -1
    }
    else if (direction == "Right" && x < this.m - 1) {
        dx = 1
    }

    if (this.HaveWall(x, y, dx, dy))
        return

    this.PlayToolMakeMove(x + dx, y + dy)
    this.Draw()
}

// обработка нажатия клавиши
Labirynth.prototype.KeyDown = function(e) {
    if (!this.isSecondField) {
        if (e.key.substr(0, 5) == "Arrow") {
            this.MakeMove(e.key.substr(5))
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