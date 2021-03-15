import {Cell, OpposingRectangularDirection, RectangularDirection} from './cell';
import {IPosition, Point} from "../utils";

export interface ISize {
  readonly height: number;
  readonly width: number;
}

export class Board {
  public readonly cells: Array<Cell>;
  public readonly size: ISize;

  constructor(width: number, height: number) {
    this.size = {height, width};
    this.cells = [];
    this.initCells();
  }

  private initCells() {
    for (let y = 0; y < this.size.height; y++) {
      for (let x = 0; x < this.size.width; x++) {
        this.cells.push(new Cell(new Point(x, y)));
      }
    }
  }

  getRandomCell(): Cell {
    return this.cells[Math.round(Math.random() * (this.cells.length - 1))];
  }

  private getCell(position: Point | IPosition): Cell {
    return this.cells[Point.from(position).toIndex(this.size.width)];
  }

  getNeighbourCells(position: Point | IPosition, visitableOnly: boolean = false): Map<RectangularDirection, Cell> {
    let neighbours = new Map<RectangularDirection, Cell>(),
      index = Point.from(position).toIndex(this.size.width);

    if (index >= this.size.width) {
      const cell = this.cells[index - this.size.width];
      neighbours.set(RectangularDirection.UP, cell);
    }

    if ((index + 1) % this.size.width != 0) {
      const cell = this.cells[index + 1];
      neighbours.set(RectangularDirection.RIGHT, cell);
    }

    if (index < this.cells.length - this.size.width) {
      const cell = this.cells[index + this.size.width];
      neighbours.set(RectangularDirection.DOWN, cell);
    }

    if (index % this.size.width != 0) {
      const cell = this.cells[index - 1];
      neighbours.set(RectangularDirection.LEFT, cell);
    }

    if (visitableOnly) {
      const visitableNeighbours = Array.from(neighbours.entries())
        .filter(([dir, cell]) => {
          return !this.hasInterWall(cell.position, position);
        });

      neighbours = new Map(visitableNeighbours);
    }

    return neighbours;
  }

  getNeighbourCell(position: Point, direction: RectangularDirection): Cell {
    const cells = this.getNeighbourCells(position);
    return cells.get(direction);
  }

  getRelativeDirection(cell1: Point | IPosition, cell2: Point | IPosition): RectangularDirection {
    if (cell1.y === cell2.y + 1) {
      return RectangularDirection.UP;
    }
    if (cell1.x === cell2.x - 1) {
      return RectangularDirection.RIGHT;
    }
    if (cell1.x === cell2.x + 1) {
      return RectangularDirection.LEFT;
    }
    if (cell1.y === cell2.y - 1) {
      return RectangularDirection.DOWN;
    }
    throw `'${cell1}' and '${cell2}' are not neighbours`;
  }

  removeInterWall(cell1: Point | IPosition, cell2: Point | IPosition): void {
    const relativeWallDirection = this.getRelativeDirection(cell1, cell2);
    const opposingWallDirection = OpposingRectangularDirection[relativeWallDirection];
    this.getCell(cell1).removeWall(relativeWallDirection);
    this.getCell(cell2).removeWall(opposingWallDirection);
  }

  addInterWall(cell1: Point | IPosition, cell2: Point | IPosition): void {
    const relativeWallDirection = this.getRelativeDirection(cell1, cell2);
    const opposingWallDirection = OpposingRectangularDirection[relativeWallDirection];
    this.getCell(cell1).setWall(relativeWallDirection);
    this.getCell(cell2).setWall(opposingWallDirection);
  }

  hasInterWall(cell1: Point | IPosition, cell2: Point | IPosition): boolean {
    const relativeWall = this.getRelativeDirection(cell1, cell2);
    const opposingWall = OpposingRectangularDirection[relativeWall];
    return this.getCell(cell1).hasWall(relativeWall) && this.getCell(cell2).hasWall(opposingWall);
  }

  isConnected(cell1: Point | IPosition, cell2: Point | IPosition): Boolean {
    const relativeWallDirection = this.getRelativeDirection(cell1, cell2);
    const opposingWallDirection = OpposingRectangularDirection[relativeWallDirection];
    return this.getCell(cell1).hasWall(relativeWallDirection) && this.getCell(cell2).hasWall(opposingWallDirection);
  }

  hasWall(position: IPosition, direction: RectangularDirection) {
    return this.getCell(position).hasWall(direction);
  }

  clone() {
    const board = new Board(this.size.width, this.size.height);
    for (let i = 0; i < board.cells.length; i++) {
      board.cells[i] = this.cells[i].clone();
    }
    return board;
  }
}
