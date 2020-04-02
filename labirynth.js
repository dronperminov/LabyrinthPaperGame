const PLAY = "PLAY"
const ADD = "ADD"
const WALL = "-" // стена
const ARBALET = "A" // арбалет
const TREASURE = "x" // клад
const BAG = "B" // ложный клад
const TRAP = "K" // капкан
const PIT = "P" // яма
const CRUTCH = "C" // костыль
const PITS = [ "1", "I", "2", "II", "3", "III", "4", "IV" ] // ямы

function Labirynth(canvas, n, m, size, isSecondField, canRemove=false) {
	this.n = n // число строк лабиринта
	this.m = m // число столбцов лабиринта
	this.size = size // размер клетки
	this.canvas = canvas // картинка
	this.ctx = canvas.getContext('2d') // контекст
	
	this.isSecondField = isSecondField
	this.canRemove = canRemove

	this.letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ"
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
	this.objects = []
	this.toolIndex = 1

	for (let i = 0; i < this.tools.length + 7; i++) {
		this.objects[i] = {
			x: -1,
			y: -1,
			isSet: false,
			index: Math.min(i, this.tools.length - 1)
		}
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

	this.pitIndex = -1
	this.isPitStart = false
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

	if (this.isSecondField)
		window.addEventListener('keypress', function(e) { labirynth.KeyDown(e) })

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
	for (let i = 0; i < this.objects.length; i++) {
		if (!this.objects[i].isSet)
			continue

		x = this.x0 + this.objects[i].x * this.size
		y = this.y0 + this.objects[i].y * this.size
		index = this.objects[i].index

		if (this.tools[index] == PIT) {
			let id = i - this.tools.length + 1
			this.ctx.font = (this.size / 3) + "px serif"
			this.ctx.textAlign = "right"
			this.ctx.fillText(PITS[id], x + this.size - 2, y + this.size - 8)
			this.ctx.drawImage(this.toolsImages[index][0], x + 2, y + 2, this.size - 8, this.size - 8)
		}
		else {
			this.ctx.drawImage(this.toolsImages[index][0], x + 2, y + 2, this.size - 4, this.size - 4)
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
Labirynth.prototype.RemovePit = function(index) {
	let start = index - this.tools.length + 1
	let second = start % 2 ? index - 1 : index + 1
	let next = Math.max(index, second) + 1

	// сдвигаем элементы на 2 влево
	for (let i = next; i < this.objects.length; i++) {
		this.objects[i - 2].x = this.objects[i].x
		this.objects[i - 2].y = this.objects[i].y
		this.objects[i - 2].isSet = this.objects[i].isSet
		this.objects[i - 2].index = this.objects[i].index
	}

	// очищаем освободившиеся ячейки
	this.objects[this.objects.length - 2].isSet = false
	this.objects[this.objects.length - 1].isSet = false
	this.pitIndex -= 2
}

Labirynth.prototype.RemoveTool = function(x, y) {
	for(let index = 0; index < this.objects.length; index++) {
		if (this.objects[index].isSet && this.objects[index].x == x && this.objects[index].y == y) {
			
			if (this.objects[index].index >= this.tools.length - 1 && !this.isSecondField) // это дыра
				this.RemovePit(index)
			else
				this.objects[index].isSet = false // удаляем этот инструмент
			break
		}
	}
}

// проверка клетки на свободу
Labirynth.prototype.IsCellEmpty = function(x, y) {
	for (let i = 0; i < this.objects.length; i++)
		if (this.objects[i].isSet && this.objects[i].x == x && this.objects[i].y == y)
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
	if (this.tools[index] == PIT && this.pitIndex == 7) // если хотим выбрать дыру, а они уже все есть
		return false

	if (this.tools[index] != PIT && this.isPitStart)
		return false // не даём менять управление, если не поставили вторую дыру

	if (this.tools[index] != PIT && this.objects[index].isSet)
		return false

	if (this.tools[index] == PIT && this.isSecondField)
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

// обработка перемещения мыши во время стены
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

Labirynth.prototype.OtherToolMouseMove = function(ix, iy) {
	if (!this.IsCellEmpty(ix, iy))
			return

	let x = this.x0 + ix * this.size
	let y = this.y0 + iy * this.size

	this.ctx.drawImage(this.toolsImages[this.toolIndex][0], x + 2, y + 2, this.size - 4, this.size - 4)
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

	if (index == this.toolIndex || !this.CanUseTool(index))
		return

	this.ctx.drawImage(this.toolsImages[index][0], this.cx0 + 2, this.cy0 + index * this.cw + 2, this.cw - 4, this.cw - 4)
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

// работа инструмента "ИГРА"
Labirynth.prototype.PlayToolMouseClick = function(ix, iy, button) {
	if (button == 0) {
		if (this.path.length == 0 || this.path[this.path.length - 1].x != ix || this.path[this.path.length - 1].y != iy)
			this.path.push({ x: ix, y: iy })
		
		return
	}

	for (let i = this.path.length - 1; i >= 0; i--)
		if (this.path[i].x == ix && this.path[i].y == iy) {
			this.path.splice(i, 1);
			return;
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
	
	this.pitIndex++
	this.objects[this.toolIndex + this.pitIndex].x = ix
	this.objects[this.toolIndex + this.pitIndex].y = iy
	this.objects[this.toolIndex + this.pitIndex].isSet = true
}

// работа инструментов кроме дыры
Labirynth.prototype.OtherToolMouseClick = function(ix, iy, button) {
	if (button == 2) {
		this.RemoveTool(ix, iy)
		return
	}

	if (!this.IsCellEmpty(ix, iy))
			return

	this.objects[this.toolIndex].x = ix
	this.objects[this.toolIndex].y = iy
	this.objects[this.toolIndex].isSet = true
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

	if (this.CanUseTool(index))
		this.toolIndex = index
}

// перемещение мыши
Labirynth.prototype.MouseMove = function(e) {
	let x = e.offsetX
	let y = e.offsetY

	this.currentPoint = null
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
	let canvas = document.createElement("canvas")
	canvas.width = (this.m * 2 - 1) * this.size + 100
	canvas.height = (this.n * 2 - 1) * this.size + 50
	
	document.body.appendChild(canvas)
	
	let labyrinth = new Labirynth(canvas, this.n * 2 - 1, this.m * 2 - 1, this.size, true, true)
	labyrinth.toolIndex = 0
	labyrinth.path.push({ x: this.n - 1, y: this.m - 1 })
	labyrinth.Draw()
}

Labirynth.prototype.RemoveLabyrinth = function() {
	document.body.removeChild(document.body.lastChild)
	this.MouseDown = function(e) {}
	this.MouseMove = function(e) {}
	this.KeyDown = function(e) {}
}

Labirynth.prototype.KeyDown = function(e) {
	if (this.tools[this.toolIndex] != PLAY || this.currentPoint == null)
		return
	
	if (e.key == "+" || e.key == "=") {
		if (confirm("Вы точно хотите добавить новое поле?"))
			this.AddNewLabirynth()
		return
	}

	if (e.key == "-" && this.canRemove) {
		if (confirm("Вы точно хотите удалить это поле (" + this.n + "x" + this.m + ")?"))
			this.RemoveLabyrinth()
		return
	}

	if (e.code == "Digit1" || e.code == "Digit2" || e.code == "Digit3" || e.code == "Digit4") {
		let key = (+e.code.substr(5) - 1) * 2

		if (e.shiftKey)
			key++

		let index = this.tools.length - 1 + key

		if (!this.IsCellEmpty(this.currentPoint.x, this.currentPoint.y))
			return

		this.objects[index].x = this.currentPoint.x
		this.objects[index].y = this.currentPoint.y
		this.objects[index].isSet = true
	}

	this.Draw()
}

Labirynth.prototype.MouseWheel = function(e) {
	let direction = e.deltaY > 0 ? 1 : -1
	
	do {
		this.toolIndex = (this.toolIndex + this.tools.length + direction) % this.tools.length
	} while (!this.CanUseTool(this.toolIndex));

	this.MouseMove(e)
	e.preventDefault()
}