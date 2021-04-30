/*--------------
 * Types
 *-------------- */

import {BaseBoard, isEnabled, setInterWallValue} from "../base";
import {PartialExcept} from "../types";

// default top direction is clock wise
export enum Direction {
  TOP_CW = 0b00001,
  TOP_CCW = 0b00010,
  RIGHT = 0b00100,
  BOTTOM = 0b01000,
  LEFT = 0b10000,
}

export interface Size {
  radius: number;
  innerRadius: number;
}

export interface Position {
  r: number;
  t: number;
}

export interface CircularBoard extends BaseBoard {
  size: Size;
}

function sum(nums: number[]) {
  return Array.from(nums).reduce((s, i) => s + i, 0);
}

/*-------------------------
 * Constructor Functions
 *------------------------- */

/**
 * Returns a new CircularBoard for the given size
 */
export function circularBoard(radius: number, innerRadius: number = 3): CircularBoard {
  const nodeCount = getRingNodeCount(radius);
  const totalNodes = sum(nodeCount.slice(innerRadius));

  return {
    cells: new Uint8Array(totalNodes),
    size: {innerRadius, radius},
  }
}

/**
 * Casts base board to RectangularBoard
 */
export function circularFromBaseBoard({cells}: BaseBoard, size: Size): CircularBoard {
  return {cells: cells, size}
}

/*-------------------------
 * Cell value Functions
 *------------------------- */

/**
 * get cell at given position
 */
export function getCell(position: Position, {cells, size}: CircularBoard): number {
  return cells[toIndex(position, {size})];
}

/**
 * set cell at given position
 */
export function setCell(position: Position, value: number, {cells, size}: CircularBoard) {
  return cells[toIndex(position, {size})] = value;
}

/*-------------------------
 * Direction Utils
 *------------------------- */

/**
 * return a opposing direction
 *
 * getOpposingDirection(Direction.BOTTOM) -> Direction.TOP_CW & Direction.TOP_CCW
 */
export function getOpposingDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.TOP_CCW:
    case Direction.TOP_CW:
      return Direction.BOTTOM;
    case Direction.RIGHT:
      return Direction.LEFT;
    case Direction.LEFT:
      return Direction.RIGHT;
  }
  return Direction.TOP_CW & Direction.TOP_CCW;
}

/**
 * Get relative direction between two positions
 *
 * Caution: it doesn't actually checks it cell are neighbours
 * in top bottom direction so don't rely the error thrown by
 * this method to check if cells are neighbour are not.
 */
export function getRelativeDirection(index1: number, index2: number, {size}: PartialExcept<CircularBoard, 'size'>): Direction {
  const pos1 = toPosition(index1, {size});
  const pos2 = toPosition(index2, {size});

  if (pos1.r + 1 === pos2.r) return Direction.BOTTOM;
  if (pos1.r === pos2.r && pos1.t + 1 === pos2.t) return Direction.RIGHT;
  if (pos1.r === pos2.r && pos1.t - 1 === pos2.t) return Direction.LEFT;

  // Here is a trick to check if pos2 is in clock-wise or counter clock-wise top direction
  // I just observed that clockwise top cells always have even index
  if (pos1.r - 1 === pos2.r && index1 % 2 === 0) return Direction.TOP_CW;
  if (pos1.r - 1 === pos2.r && index1 % 2 === 1) return Direction.TOP_CCW;

  throw `'${pos1}' and '${pos2}' are not neighbours`;
}

/*-------------------------
 * Position Utils
 *------------------------- */

export function getRingNodeCount(radius: number): number[] {
  let nodeCount = [1];
  let nodeCountSum = [0];

  for (let i = 1; i < radius; ++i) {
    nodeCount[i] = nodeCount[i - 1];
    if (2 * Math.PI * i / nodeCount[i - 1] > 2) nodeCount[i] *= 2;
    nodeCountSum[i] = nodeCountSum[i - 1] + nodeCount[i - 1];
  }

  return nodeCount;
}

/**
 * Linear index from position
 */
export function toIndex(position: Position, {size}: PartialExcept<CircularBoard, 'size'>): number {
  const nodeCount = getRingNodeCount(size.innerRadius + position.r).slice(size.innerRadius);
  return sum(nodeCount) + position.t;
}

/**
 * Position from linear index
 */
export function toPosition(index: number, {size}: PartialExcept<CircularBoard, 'size'>): Position {
  const nodeCount = getRingNodeCount(size.radius).slice(size.innerRadius);
  const nodeCountSum = nodeCount
    .reduce((acc, v) => {
      acc.push(acc[acc.length - 1] + v);
      return acc;
    }, [0]);
  const r = nodeCountSum.findIndex((val) => val > index);
  return {
    r: r - 1,
    t: index - nodeCountSum[r - 1],
  };
}

/**
 * return array of rows of cells
 */
export function getRows({size}: CircularBoard): number[][] {
  const nodeCounts = getRingNodeCount(size.radius).slice(size.innerRadius);
  let sum = 0, rows = [];
  for (let count of nodeCounts) {
    rows.push(Array.from(new Array(count), (_, i) => sum + i));
    sum += count;
  }
  return rows;
}

/*-------------------------
 * Cell Neighbourhood Utils
 *------------------------- */

/*-------------------------
 * Cell Wall Utils
 *------------------------- */

/**
 * Remove wall between the given two cell Indexes
 */
export function removeInterWall(index1: number, index2: number, board: CircularBoard): CircularBoard {
  return setInterWallValue<CircularBoard, Direction>(
    index1, index2, board,
    getOpposingDirection,
    getRelativeDirection,
    (cell, dir) => cell | dir
  )
}

/**
 * Get neighbours of current cell in next row
 */
export function getNextRowNeighbours(index: number, {size}: CircularBoard): number[] {
  const nodeCount = getRingNodeCount(size.radius).slice(size.innerRadius);
  const nodeCountSum = nodeCount
    .reduce((acc, v) => {
      acc.push(acc[acc.length - 1] + v);
      return acc;
    }, [0]);

  const r = nodeCountSum.findIndex((val) => val > index) - 1;
  const t = index - nodeCountSum[r];

  if (nodeCount[r] < nodeCount[r+1]) {
    const cellIndex = toIndex({r: r + 1, t: t * 2}, {size});
    return [cellIndex, cellIndex + 1];
  }

  const cellIndex = toIndex({r: r + 1, t}, {size});
  return [cellIndex];
}
