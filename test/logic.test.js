const { info,
    move,
    isCollidedWithSnakes,
    paintBucketFill,
    isOutOfBounds
} = require('../src/logic');

function createGameState(myBattlesnake) {
    return {
        game: {
            id: '',
            ruleset: { name: '', version: '' },
            timeout: 0,
        },
        turn: 0,
        board: {
            height: 11,
            width: 11,
            food: [],
            snakes: [myBattlesnake],
            hazards: [],
        },
        you: myBattlesnake,
    };
}

function createBattlesnake(id, bodyCoords) {
    return {
        id: id,
        name: id,
        health: 0,
        body: bodyCoords,
        latency: '',
        head: bodyCoords[0],
        length: bodyCoords.length,
        shout: '',
        squad: '',
    };
}

describe('Battlesnake API Version', () => {
    test('should be api version 1', () => {
        const result = info();
        expect(result.apiversion).toBe('1');
    });
});

describe('Battlesnake Basic Survival', () => {
    test('should never move into its own neck', () => {
        // Arrange
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 0 },
        ]);
        const gameState = createGameState(me);

        // Act 1,000x (this isn't a great way to test, but it's okay for starting out)
        for (let i = 0; i < 1000; i++) {
            const moveResponse = move(gameState);
            // In this state, we should NEVER move left.
            const allowedMoves = ['up', 'down', 'right'];
            expect(allowedMoves).toContain(moveResponse.move);
        }
    });

    test(`Doesn't run into walls in non-wrapped games, but is free to move into them during wrapped`, () => {
        const me = createBattlesnake('me', [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
        ]);
        const gameState = createGameState(me);

        for (let i = 0; i < 1000; i++) {
            const moveResponse = move(gameState);
            expect(moveResponse.move).toEqual('up');
        }

        gameState.game.ruleset.name === 'wrapped';
        for (let i = 0; i < 1000; i++) {
            const moveResponse = move(gameState);
            const allowedMoves = ['up', 'down', 'left'];
            expect(allowedMoves.includes(moveResponse.move)).toEqual(true);
        }
    });

    test(`Knows moving into tail is safe`, () => {
        const me = createBattlesnake('me', [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 2, y: 1 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
        ]);
        const gameState = createGameState(me);
        for (let i = 0; i < 100; i++) {
            const moveResponse = move(gameState);
            expect(moveResponse.move).toEqual('up');
        }
    });

    test(`Won't collide with own body`, () => {
        const me = createBattlesnake('me', [
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 2, y: 1 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
        ]);
        const gameState = createGameState(me);
        for (let i = 0; i < 100; i++) {
            const moveResponse = move(gameState);
            expect(moveResponse.move).toEqual('left');
        }
    });

    test(`Won't collide with other snakes`, () => {
        const me = createBattlesnake('me', [
            { x: 1, y: 16 },
            { x: 1, y: 15 },
            { x: 1, y: 14 },
        ]);
        const other = createBattlesnake('other', [
            { x: 1, y: 17 },
            { x: 2, y: 17 },
            { x: 3, y: 17 },
        ]);
        const gameState = createGameState(me);
        gameState.board.snakes.push(other);
        for (let i = 0; i < 100; i++) {
            const moveResponse = move(gameState);
            const didntGoUp = moveResponse.move !== 'up';
            expect(didntGoUp).toEqual(true);
        }
    });

    test(`Won't collide with other snakes in wrapped mode`, () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 3, y: 0 },
            { x: 4, y: 0 },
        ]);
        const other = createBattlesnake('other', [
            { x: 2, y: 18 },
            { x: 3, y: 18 },
            { x: 4, y: 18 },
        ]);
        const gameState = createGameState(me);
        gameState.board.width = 19;
        gameState.board.height = 19;
        gameState.game.ruleset.name = 'wrapped';
        gameState.board.snakes.push(other);

        for (let i = 0; i < 100; i++) {
            const moveResponse = move(gameState);
            const allowedMoves = ['up', 'left'];
            expect(allowedMoves.includes(moveResponse.move)).toEqual(true);
        }
    });

    test(`Grab food adjacent to head`, () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 3, y: 0 },
            { x: 4, y: 0 },
        ]);
        //me.health = 100;
        const gameState = createGameState(me);
        gameState.board.food = [{ x: 2, y: 1 }];
        for (let i = 0; i < 100; i++) {
            const moveResponse = move(gameState);
            expect(moveResponse.move).toEqual('up');
        }
    });

    test(`Grab food adjacent to head in wrapped mode`, () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 3, y: 0 },
            { x: 4, y: 0 },
        ]);
        const gameState = createGameState(me);
        gameState.game.ruleset.name = 'wrapped';
        gameState.board.food = [{ x: 2, y: 18 }];
        for (let i = 0; i < 100; i++) {
            const moveResponse = move(gameState);
            expect(moveResponse.move).toEqual('down');
        }
    });

    test(`Avoid possible moves that lead to dead ends`, () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 4, y: 2 },
            { x: 4, y: 1 },
            { x: 4, y: 0 },
            { x: 3, y: 0 },
            { x: 2, y: 0 }
        ]);
        const gameState = createGameState(me);
        for (let i = 0; i < 100; i++) {
            const moveResponse = move(gameState);
            const allowedMoves = ['down', 'left'];
            expect(allowedMoves.includes(moveResponse.move)).toEqual(true);
        }
    });

    test(`Avoid other snakes (isolated function check)`, () => {
        const me = createBattlesnake('me', [
            { x: 1, y: 16 },
            { x: 1, y: 15 },
            { x: 1, y: 14 },
        ]);
        const other = createBattlesnake('other', [
            { x: 1, y: 17 },
            { x: 2, y: 17 },
            { x: 3, y: 17 },
        ]);
        const gameState = createGameState(me);
        gameState.board.snakes.push(other);
        for (let i = 0; i < 100; i++) {
            expect(isCollidedWithSnakes({ x: 1, y: 17 },gameState,0)).toEqual(true);
        }
    })

    
    test(`Avoid other snakes (isolated function check)`, () => {
        const me = createBattlesnake('me', [
            { x: 1, y: 16 },
            { x: 1, y: 15 },
            { x: 1, y: 14 },
        ]);
        const other = createBattlesnake('other', [
            { x: 1, y: 17 },
            { x: 2, y: 17 },
            { x: 3, y: 17 },
        ]);
        const gameState = createGameState(me);
        gameState.board.snakes.push(other);
        for (let i = 0; i < 100; i++) {
            expect(isCollidedWithSnakes({ x: 0, y: 17 },gameState,0)).toEqual(false);
        }
    })

    test(`Avoid other snakes EXCEPT tail (isolated function check)`, () => {
        const me = createBattlesnake('me', [
            { x: 1, y: 16 },
            { x: 1, y: 15 },
            { x: 1, y: 14 },
        ]);
        const other = createBattlesnake('other', [
            { x: 1, y: 17 },
            { x: 2, y: 17 },
            { x: 3, y: 17 },
        ]);
        const gameState = createGameState(me);
        gameState.board.snakes.push(other);
        for (let i = 0; i < 100; i++) {
            expect(isCollidedWithSnakes({ x: 3, y: 17 },gameState,1)).toEqual(false);
        }
    })

    test('Is coord out of bounds', () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 2, y: 1 },
            { x: 2, y: 2 },
            { x: 1, y: 2 },
            { x: 0, y: 2 },
        ]);
        const gameState = createGameState(me);
        expect(isOutOfBounds({x:1,y:0},gameState)).toEqual(false);
        expect(isOutOfBounds({x:-1,y:0},gameState)).toEqual(true);
        expect(isOutOfBounds({x:20,y:0},gameState)).toEqual(true);
        expect(isOutOfBounds({x:0,y:-2},gameState)).toEqual(true);
        expect(isOutOfBounds({x:0,y:20},gameState)).toEqual(true);
    })

    test(`Check paint bucket fill tight space`, () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 2, y: 1 },
            { x: 2, y: 2 },
            { x: 1, y: 2 },
            { x: 0, y: 2 }, 
            { x: 0, y: 3 }, 
            { x: 0, y: 4 }, 
            { x: 0, y: 5 }, 
            { x: 0, y: 6 }, 
            { x: 0, y: 7 }, 
            { x: 0, y: 8 }, 
        ]);
        const gameState = createGameState(me);
        expect(paintBucketFill({x:1,y:0},gameState)).toEqual(4);
    })

    test(`Check paint bucket fill large space`, () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 2, y: 1 },
            { x: 2, y: 2 },
            { x: 1, y: 2 },
            { x: 0, y: 2 },
        ]);
        const gameState = createGameState(me);
        expect(paintBucketFill({x:3,y:0},gameState)).toEqual(121);
    })

    
    test(`Check paint bucket fill large space, differing board dimensions`, () => {
        const me = createBattlesnake('me', [
            { x: 2, y: 0 },
            { x: 2, y: 1 },
            { x: 2, y: 2 },
            { x: 1, y: 2 },
            { x: 0, y: 2 },
        ]);
        const gameState = createGameState(me);
        gameState.board.height = 10;
        gameState.board.width = 10;
        expect(paintBucketFill({x:3,y:0},gameState)).toEqual(100);
    })
});
