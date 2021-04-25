import {BaseBoard, isEnabled, hasCellWall} from "./base";
import {Optional} from 'utility-types';

/*--------------
 * Types
 *-------------- */

export enum Direction {
  TOP = 0b0001,
  RIGHT = 0b0010,
  BOTTOM = 0b0100,
  LEFT = 0b1000,
}

export interface Size {
  height: number;
  width: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface RectangularBoard extends BaseBoard {
  size: Size;
}


/*-------------------------
 * Constructor Functions
 *------------------------- */

/**
 * Returns a new rectangularBoard for the given size
 */
export function rectangularBoard(size: Size): RectangularBoard {
  return {
    cells: new Uint8Array(size.width * size.height),
    size,
  }
}

/**
 * Casts base board to RectangularBoard
 */
export function rectangularFromBaseBoard({cells}: BaseBoard, size: Size): RectangularBoard {
  return {cells: cells, size}
}

/*-------------------------
 * Position Functions
 *------------------------- */

/**
 * Linear index from position
 */
export function toIndex(position: Position, {size}: Optional<RectangularBoard, 'cells'>) {
  return position.y * size.width + position.x;
}

/**
 * Position from linear index
 */
export function toPosition(index: number, {size}: Optional<RectangularBoard, 'cells'>) {
  return {
    x: index % size.height,
    y: Math.floor(index / size.height),
  };
}

/*-------------------------
 * Cell value Functions
 *------------------------- */

/**
 * get cell at given position
 */
export function getCell(position: Position, {cells, size}: RectangularBoard): number {
  return cells[toIndex(position, {size})];
}

/**
 * set cell at given position
 */
export function setCell(position: Position, value: number, {cells, size}: RectangularBoard) {
  return cells[toIndex(position, {size})] = value;
}

/*-------------------------
 * Direction Utils
 *------------------------- */

/**
 * return a opposing direction
 *
 * getOpposingDirection(Direction.LEFT) -> Direction.RIGHT
 */
export function getOpposingDirection(direction: Direction): Direction {
  return ((direction << 2) | (direction >> 2)) & 0b1111;
}

/**
 * Get relative direction between two positions
 */
export function getRelativeDirection(pos1: Position, pos2: Position): Direction {
  if (pos1.y < pos2.y) return Direction.TOP;
  if (pos1.x > pos2.x) return Direction.RIGHT;
  if (pos1.y > pos2.y) return Direction.BOTTOM;
  if (pos1.x < pos2.x) return Direction.LEFT;

  throw `'${pos1}' and '${pos2}' are not neighbours`;
}

/*-------------------------
 * Cell Neighbourhood Utils
 *------------------------- */

/**
 * Returns a new position in direction relative to the given position
 */
export function getRelativePosition({x, y}: Position, direction: Direction) {
  let newPosition = {x, y};
  if (direction === Direction.TOP) newPosition.y--;
  if (direction === Direction.RIGHT) newPosition.x++;
  if (direction === Direction.BOTTOM) newPosition.y++;
  if (direction === Direction.LEFT) newPosition.x--;
  return newPosition;
}

/**
 * Get neighbour cells of the given position
 */
export function getNeighbourCells(position: Position, {cells, size}: RectangularBoard, visitableOnly = false) {
  let neighbours = new Map<Direction, number>(),
    index = toIndex(position, {size});

  if (index >= size.width) {
    const cell = cells[index - size.width];
    if (isEnabled(cell))
      neighbours.set(Direction.TOP, cell);
  }

  if ((index + 1) % size.width != 0) {
    const cell = cells[index + 1];
    if (isEnabled(cell))
      neighbours.set(Direction.RIGHT, cell);
  }

  if (index < cells.length - size.width) {
    const cell = cells[index + size.width];
    if (isEnabled(cell))
      neighbours.set(Direction.BOTTOM, cell);
  }

  if (index % size.width != 0) {
    const cell = cells[index - 1];
    if (isEnabled(cell))
      neighbours.set(Direction.LEFT, cell);
  }

  if (visitableOnly) {
    const visitableNeighbours = Array.from(neighbours.entries())
      .filter(([dir]) => {
        return !hasInterWall(getRelativePosition(position, dir), position, {cells: cells, size});
      });

    neighbours = new Map(visitableNeighbours);
  }

  return neighbours;
}

/**
 * Returns a neighbour cell in relative direction of given position
 */
export function getNeighbourCell(position: Position, direction: Direction, {cells, size}: RectangularBoard) {
  const newPosition = getRelativePosition(position, direction);
  return getCell(newPosition, {cells: cells, size});
}

/**
 * get allowed directions from a given position
 *
 * if visitableOnly is false then it only check nif neighbour is enabled or not
 */
export function getAllowedDirection({x, y}: Position, {cells, size}: RectangularBoard, visitableOnly = true) {
  let directions = [];

  if (y > 0) directions.push(Direction.TOP);
  if (x < size.width - 1) directions.push(Direction.RIGHT);
  if (y < size.height - 1) directions.push(Direction.BOTTOM);
  if (x > 0) directions.push(Direction.LEFT);

  directions.filter((dir) => {
    const newPos = getRelativePosition({x, y}, dir);
    const cell = cells[toIndex(newPos, {size})];
    if (visitableOnly && hasInterWall(newPos, {x, y}, {cells: cells, size})) {
      return false;
    }
    return isEnabled(cell);
  });

  return directions;
}

/*-------------------------
 * Cell Wall Utils
 *------------------------- */

function _setInterWall(
  pos1: Position, pos2: Position,
  {cells, size}: RectangularBoard,
  fn: (cell: number, dir: Direction) => number
) {
  const cell1 = getCell(pos1, {cells: cells, size});
  const cell2 = getCell(pos1, {cells: cells, size});

  const cell1Dir = getRelativeDirection(pos1, pos2);
  const cell2Dir = getOpposingDirection(cell1Dir);

  isEnabled(cell1) && setCell(pos1, fn(cell1, cell1Dir), {cells: cells, size});
  isEnabled(cell2) && setCell(pos2, fn(cell2, cell2Dir), {cells: cells, size});
}

/**
 * Remove wall between the given two cell positions
 */
export function removeInterWall(pos1: Position, pos2: Position, {cells, size}: RectangularBoard): void {
  _setInterWall(pos1, pos2, {cells: cells, size}, (cell, dir) => cell & ~dir);
}

/**
 * Set wall between the given two cell positions
 */
export function setInterWall(pos1: Position, pos2: Position, {cells, size}: RectangularBoard): void {
  _setInterWall(pos1, pos2, {cells: cells, size}, (cell, dir) => cell | dir);
}

/**
 * Set wall between the given two cell positions
 */
export function hasInterWall(pos1: Position, pos2: Position, {cells, size}: RectangularBoard): boolean {
  const cell1Dir = getRelativeDirection(pos1, pos2);
  const cell2Dir = getOpposingDirection(cell1Dir);

  return hasWall(pos1, cell1Dir, {cells: cells, size}) && hasWall(pos2, cell2Dir, {cells: cells, size});
}

/**
 * has cell at given position have wall in the given direction
 */
export function hasWall(position: Position, direction: Direction, {cells, size}: RectangularBoard) {
  return hasCellWall(getCell(position, {cells: cells, size}), Math.log2(direction));
}
