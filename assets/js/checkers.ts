  /**********************/
 /*VARIABLE DEFINITIONS*/
/**********************/

const qS = (selector: string): any => document.querySelector(selector);
const qSA = (selector: string): any => document.querySelectorAll(selector);

const loading: any = qS('#loading');
const knights: any = qSA('.knight');
const coverContainer: any = qS('#cover-flex-container');
const cover: any = qS('#cover');
const rules: any = qS('#rules');
const playButton: any = qS('#play-button');
const newGameButton: any = qS('#newgame-button');
const tiles: any[] = [
    null, 
    qSA('.first'), 
    qSA('.second'), 
    qSA('.third'), 
    qSA('.fourth'), 
    qSA('.fifth'), 
    qSA('.sixth'), 
    qSA('.seventh'), 
    qSA('.eighth')
];
    
let turn: string;
let whitePawns: number;
let blackPawns: number;
let lastSelected: any;


  /**********************/
 /*FUNCTION DEFINITIONS*/
/**********************/

const gameStart = (): void => {
    [turn, whitePawns, blackPawns, lastSelected] = ['whitePawn', 12, 12, null];
    knights[0].style.opacity = '1';
    knights[1].style.opacity = '0.3';
    tiles.forEach(row => !row || clearTiles(row)); // tiles[0] is null
    fillPawns();
};

/* Places all the pawns in their initial position */
const fillPawns = (): void => {
    tiles.forEach((row, rowIndex) => {
        if (rowIndex >= 1 && rowIndex <= 3) {
            row.forEach((tile: any) => setPawn('whitePawn', tile));
        } else if (rowIndex >= 6 && rowIndex <= 8) {
            row.forEach((tile: any) => setPawn('blackPawn', tile));
        }
    });
    tiles.forEach((row, rowIndex) =>
        !row || row.forEach((tile: any, tileIndex: number) =>
            tile.addEventListener('click', () => checkChosenPath(tile, rowIndex, tileIndex))
        )
    );
};

const setPawn = (pawnColor: string, tile: any): void => {
    tile.classList.add(pawnColor == 'whitePawn' ? 'white-pawn' : 'black-pawn');
    tile[pawnColor] = true;
};

/* Clears all previous pawns */
const clearTiles = (tilesRow: any): void => {
    tilesRow.forEach((tile: any) => { 
        tile.classList.remove('white-pawn', 'black-pawn', 'white-king', 'black-king'); 
        delete tile.whitePawn; delete tile.blackPawn; delete tile.king; 
    });
};

const checkChosenPath = (selectedTile: any, row: number, tile: number): void => {
    if (selectedTile.classList.contains('suggested-move')) { // if a suggested path is taken (a pawn can move only to a suggested path)
        if (selectedTile.captured) { // if the pressed tile is a suggested capture path
            executeCapture(selectedTile.captured);
         }
        if (turn == 'whitePawn') { // white turn
            if (lastSelected.king || row == 8) { // if the previously selected pawn is a king or is about to become one
                delete lastSelected.king; // since selectedTile and lastSelected might be the same (diamond capture scenario), this line has to be here and not outside the big 'if' statement in line 92
                selectedTile.classList.add('white-king');
                selectedTile.king = true;   
            } else {
                selectedTile.classList.add('white-pawn');
            }
            if (selectedTile != lastSelected) { // this makes sure that a pawn does not disappear after performing a diamond capture
                lastSelected.classList.remove('white-pawn', 'white-king');
                delete lastSelected.whitePawn;  
            }
            selectedTile.whitePawn = true;
        } else { // black turn
            if (lastSelected.king || row == 1) {
                delete lastSelected.king;
                selectedTile.classList.add('black-king');
                selectedTile.king = true;
            } else {
                selectedTile.classList.add('black-pawn');
            }
            if (selectedTile != lastSelected) {
                lastSelected.classList.remove('black-pawn', 'black-king');
                delete lastSelected.blackPawn;   
            }
            selectedTile.blackPawn = true;
        }
        if (!checkGameOver()) {
            switchTurns();
        }
    }
    clearSuggestions();
    if (selectedTile[turn] && !checkGameOver()) { // if a current turn pawn is selected (checkGameOver prevents the issue when the final move is clicked twice and shows suggestions even after the game is over)
        selectedTile.classList.add('pressed-pawn');
        paths(selectedTile, row, tile);
    }
    if (lastSelected) { 
        lastSelected.classList.remove('pressed-pawn');
    }
    lastSelected = selectedTile; // 'remembers' the last tile that was selected, this allows a capturer to move to its new position
};

const paths = (selectedTile: any, row: number, tile: number): void => {
    if (turn == 'whitePawn') { // white turn
        (row % 2 == 0) ? 
        findPaths(row, tile, 1, 1, 1, 'whitePawn', 'blackPawn', selectedTile) : 
        findPaths(row, tile, 1, -1, -1, 'whitePawn', 'blackPawn', selectedTile);
    } else { // black turn
        (row % 2 == 0) ? 
        findPaths(row, tile, -1, 1, 1, 'blackPawn', 'whitePawn', selectedTile) : 
        findPaths(row, tile, -1, -1, -1, 'blackPawn', 'whitePawn', selectedTile);   
    }
    
    const stepTiles = [...qSA('.suggested-move')];
    const captureTiles = [...qSA('.intermediate-capture')];
    
    if (captureTiles.length > 0) { // if there are captures
        filterPaths(stepTiles, captureTiles);
    }
};

const clearSuggestions = (): void => {
    tiles.forEach(row => 
        !row || row.forEach((tile: any) => {
            tile.classList.remove('suggested-move', 'intermediate-capture', 'capture');
            delete tile.captured;
        })
    );
};

/* A backtracking recursion that finds all of the possible movements */
const findPaths = (
    row: number,
    tile: number, 
    rStep: number, 
    tStep: number, 
    doubleTileStep: number, 
    friend: string, 
    foe: string, 
    originalPawn: any, 
    captureOccured: boolean = false, 
    capturedArr: NodeListOf<Element>[] = []
): void => {
    /* FORWARD MOVEMENT */
    if (tiles[row+rStep] && tiles[row+rStep][tile+tStep] && !tiles[row+rStep][tile+tStep][friend]) { // if not friend
        if (!tiles[row+rStep][tile+tStep][foe]) { // if empty and the pressed pawn is not a king
            if (!captureOccured || originalPawn.king) tiles[row+rStep][tile+tStep].classList.add('suggested-move'); // a step without a capture
        } else if (tiles[row+rStep*2] && tiles[row+rStep*2][tile+doubleTileStep] && !tiles[row+rStep*2][tile+doubleTileStep].captured) { // if jump tile exists AND has no captured
            if (!tiles[row+rStep*2][tile+doubleTileStep][friend] && !tiles[row+rStep*2][tile+doubleTileStep][foe] || tiles[row+rStep*2][tile+doubleTileStep] == originalPawn && capturedArr.length >= 3) { // if jump tile is empty OR if jump tile equals the pressed tile AND at least 3 captures have been marked
                capturedArr.push(tiles[row+rStep][tile+tStep]);
                showPaths(row+rStep*2, tile+doubleTileStep, row+rStep, tile+tStep, capturedArr.slice());
                findPaths(row+rStep*2, tile+doubleTileStep, rStep, tStep, doubleTileStep, friend, foe, originalPawn, true, capturedArr.slice());
                capturedArr.pop();
            }
        }
    }
    
    if (tiles[row+rStep] && tiles[row+rStep][tile] && !tiles[row+rStep][tile][friend]) {
        if (!tiles[row+rStep][tile][foe]) {
            if (!captureOccured || originalPawn.king) tiles[row+rStep][tile].classList.add('suggested-move');
        } else if (tiles[row+rStep*2] && tiles[row+rStep*2][tile-doubleTileStep] && !tiles[row+rStep*2][tile-doubleTileStep].captured) {
            if (!tiles[row+rStep*2][tile-doubleTileStep][friend] && !tiles[row+rStep*2][tile-doubleTileStep][foe] || tiles[row+rStep*2][tile-doubleTileStep] == originalPawn && capturedArr.length >= 3) {
                capturedArr.push(tiles[row+rStep][tile]);
                showPaths(row+rStep*2, tile-doubleTileStep, row+rStep, tile, capturedArr.slice());
                findPaths(row+rStep*2, tile-doubleTileStep, rStep, tStep, doubleTileStep, friend, foe, originalPawn, true, capturedArr.slice());
                capturedArr.pop();
            }
        }
    }
    
    /* BACKWARD MOVEMENT */
    if (tiles[row-rStep] && tiles[row-rStep][tile+tStep] && !tiles[row-rStep][tile+tStep][friend]) { 
        if (tiles[row-rStep][tile+tStep][foe]) {
            if (tiles[row-rStep*2] && tiles[row-rStep*2][tile+doubleTileStep] && !tiles[row-rStep*2][tile+doubleTileStep].captured) { 
                if (!tiles[row-rStep*2][tile+doubleTileStep][friend] && !tiles[row-rStep*2][tile+doubleTileStep][foe] || tiles[row-rStep*2][tile+doubleTileStep] == originalPawn && capturedArr.length >= 3) {
                    capturedArr.push(tiles[row-rStep][tile+tStep]);
                    showPaths(row-rStep*2, tile+doubleTileStep, row-rStep, tile+tStep, capturedArr.slice());
                    findPaths(row-rStep*2, tile+doubleTileStep, rStep, tStep, doubleTileStep, friend, foe, originalPawn, true, capturedArr.slice());
                    capturedArr.pop();
                }
            }
        } else if (originalPawn.king) {
            tiles[row-rStep][tile+tStep].classList.add('suggested-move'); // only a king is allowed to move backwards without a capture
        }
    }
    
    if (tiles[row-rStep] && tiles[row-rStep][tile] && !tiles[row-rStep][tile][friend]) { 
        if (tiles[row-rStep][tile][foe]) {
            if (tiles[row-rStep*2] && tiles[row-rStep*2][tile-doubleTileStep] && !tiles[row-rStep*2][tile-doubleTileStep].captured) {
                if (!tiles[row-rStep*2][tile-doubleTileStep][friend] && !tiles[row-rStep*2][tile-doubleTileStep][foe] || tiles[row-rStep*2][tile-doubleTileStep] == originalPawn && capturedArr.length >= 3) {
                    capturedArr.push(tiles[row-rStep][tile]);
                    showPaths(row-rStep*2, tile-doubleTileStep, row-rStep, tile, capturedArr.slice());
                    findPaths(row-rStep*2, tile-doubleTileStep, rStep, tStep, doubleTileStep, friend, foe, originalPawn, true, capturedArr.slice());
                }
            }
        } else if (originalPawn.king) {
            tiles[row-rStep][tile].classList.add('suggested-move');
        }
    }
};

const showPaths = (
    rowJump: number, 
    tileJump: number, 
    rowCapture: number, 
    tileCapture: number, 
    capturedArr: any[]
): void => {
    tiles[rowJump][tileJump].captured = capturedArr;
    tiles[rowJump][tileJump].classList.add('intermediate-capture');
    tiles[rowCapture][tileCapture].classList.add('capture');
};

const filterPaths = (stepTiles: any[], captureTiles: any[]): void => {
    stepTiles.forEach(tile => tile.classList.remove('suggested-move')); // removes all step tiles, since capture is mandatory for a specific pawn
    captureTiles // leaves only the max length captures
        .sort((a, b) => b.captured.length - a.captured.length)
        .filter(tile => tile.captured.length == captureTiles[0].captured.length)
        .forEach(tile => { tile.classList.remove('intermediate-capture'); tile.classList.add('suggested-move'); });
};

const executeCapture = (captured: any[]): void => {
    turn == 'whitePawn' ? blackPawns -= captured.length : whitePawns -= captured.length;
    clearTiles(captured);
};

const switchTurns = (): void => {
    if (turn == 'whitePawn') {
        turn = 'blackPawn';
        knights[0].style.opacity = '0.3';
        knights[1].style.opacity = '1';
    } else {
        turn = 'whitePawn';
        knights[0].style.opacity = '1';
        knights[1].style.opacity = '0.3';
    }
};

const checkGameOver = (): boolean => {
    if (whitePawns == 0 || blackPawns == 0) {
        coverContainer.style.display = 'flex';
        cover.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
        newGameButton.style.display = 'inline-block';
        return true;
    }
    return false;
};


  /*****************/
 /*EVENT LISTENERS*/
/*****************/

window.addEventListener('DOMContentLoaded', () => { 
    setTimeout(() => loading.style.opacity = '0', 500);
    loading.addEventListener('transitionend', () => document.body.removeChild(loading));
});

knights.forEach((knight: any) => knight.addEventListener('click', 
    () => {
        if (confirm('Restart the game?')) {
            gameStart();
        }
    })
);

playButton.addEventListener('click', () => { 
    cover.addEventListener('transitionend', () => coverContainer.style.display = 'none'); // prevents the 'no cover on first launch' issue
    playButton.style.display = 'none';
    rules.style.display = 'none'; 
    cover.style.backgroundColor = 'rgba(255, 255, 255, 0)'; 
    gameStart(); 
});

newGameButton.addEventListener('click', () => { 
    newGameButton.style.display = 'none'; 
    cover.style.backgroundColor = 'rgba(255, 255, 255, 0)'; 
    gameStart(); 
});