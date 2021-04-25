import {BaseBoard} from "../base";
import {getItemSet, isFromSameSet, ItemSets, joinItemSets} from "./_pathSet";
import {getRandomFrom, shuffle} from "../../utils";

interface BoardFunctions<Board extends BaseBoard> {
  /** returns array of set of cell indexes in a row */
  getRows(board: Board): number[][];
  /** remove walls between given two cell indexes */
  removeInterWall(index1: number, index2: number, board: Board): Board;
  /** get cell neighbour from next row */
  getNextRowNeighbours(index: number, board: Board): number[];
}

/**
 * Generates maze using Eller's  maze generation Algorithm
 *
 * Ref: https://weblog.jamisbuck.org/2010/12/29/maze-generation-eller-s-algorithm
 */
export function generate<Board extends BaseBoard>(board: Board, fns: BoardFunctions<Board>) {
  let pathSets: ItemSets<number> = [];
  const rows = fns.getRows(board);

  // create pathSet for each cell in first row
  for (let index of rows[0]) {
    pathSets.push(new Set([index]));
  }

  for (let row of rows.slice(0, -1)) {
    board = visitRow(row, false, board, pathSets, fns);
    board = visitNextRow(row, board, pathSets, fns);
  }

  board = visitRow(rows[0], true, board, pathSets, fns);
  return board;
}

function visitRow<Board extends BaseBoard>(
  row: number[],
  mergeAll: boolean,
  board: Board,
  pathSets: ItemSets<number>,
  fns: BoardFunctions<Board>
): Board {
  for (let i = 1; i < row.length; i++) {
    if (isFromSameSet(row[i - 1], row[i], pathSets)) {
      continue;
    }

    if (Math.random() > 0.5 || mergeAll) {
      board = fns.removeInterWall(row[i - 1], row[i], board);
      pathSets = joinItemSets(row[i - 1], row[i], pathSets);
    } else if (getItemSet(row[i - 1], pathSets) == null) {
      pathSets.push(new Set([row[i - 1]]));
    } else if (getItemSet(row[i], pathSets) == null) {
      pathSets.push(new Set([row[i]]));
    }
  }

  return board;
}

function visitNextRow<Board extends BaseBoard>(
  row: number[],
  board: Board,
  pathSets: ItemSets<number>,
  fns: BoardFunctions<Board>
): Board {
  for (let set of pathSets) {
    let rowCells = Array.from(set).filter((index) => row.includes(index));

    rowCells = shuffle(rowCells);
    let n = 1 + Math.round(Math.random() * (rowCells.length - 1));
    for (let i = 0; i < n; i++) {
      const cell = rowCells[i];
      const nextRowCells = fns.getNextRowNeighbours(cell, board);
      const nextCell = getRandomFrom(nextRowCells);

      board = fns.removeInterWall(cell, nextCell, board);
      set.add(nextCell);
    }
  }

  return board;
}
