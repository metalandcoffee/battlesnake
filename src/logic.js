const directions = ['up', 'down', 'left', 'right'];

function info() {
  console.log('INIT');
  const response = {
    apiversion: '1',
    author: '',
    color: '#4B0082',
    head: 'bendr',
    tail: 'freckled',
  };
  return response;
}

function start(gameState) {
  console.log(`${gameState.game.id} START`);
}

function end(gameState) {
  console.log(`${gameState.game.id} END\n`);
}

function move(gameState) {
  const myHead = gameState.you.head;
  const myNeck = gameState.you.body[1];


  let possibleMoves = {
    up: true,
    down: true,
    left: true,
    right: true,
  };

  function numberOfEnabledMoves() {
    return Object.values(possibleMoves).filter((enabled) => enabled === true)
      .length;
  }

  /* Don't let your Battlesnake move back on its own neck */
  if (myNeck.x < myHead.x) {
    possibleMoves.left = false;
  } else if (myNeck.x > myHead.x) {
    possibleMoves.right = false;
  } else if (myNeck.y < myHead.y) {
    possibleMoves.down = false;
  } else if (myNeck.y > myHead.y) {
    possibleMoves.up = false;
  }

  //https://docs.battlesnake.com/references/api/sample-move-request
  /* Don't hit the walls, or other snakes,                       or enter areas where I can't fit */
  for (const direction of directions){ 
    const lookAheadCoords = moveLookAhead(myHead,direction, gameState);
    const isClear = isClearSpace(lookAheadCoords,gameState, 1);
    const numOfEmptySpaces =  paintBucketFill(lookAheadCoords, gameState);
    const canFit = gameState.you.length < numOfEmptySpaces
    if (!isClear || !canFit){ 
      possibleMoves[direction] = false;
    }
  }



  /* Avoid loser snake heads that are adjacent to possible moves. */
  // If losersnake's head is 1 distance away from one of my possible moves, disable move.
  // @todo update logic to check if I am stronger than snake first before avoiding.
  let loserSnakes = gameState.board.snakes
    .filter((snake) => snake.id !== gameState.you.id)
    .map((snake) => snake.head);
  for (let i = 0; i < loserSnakes.length; i++) {
    for (const direction of directions) {
      // Find distance from possible move to losersnake's head.
      let xDistFrom = Math.abs(
        moveLookAhead(myHead, direction, gameState).x - loserSnakes[i].x
      );
      if (xDistFrom > gameState.board.width / 2) {
        xDistFrom = gameState.board.width - xDistFrom;
      }
      let yDistFrom = Math.abs(
        moveLookAhead(myHead, direction, gameState).y - loserSnakes[i].y
      );
      if (yDistFrom > gameState.board.height / 2) {
        yDistFrom = gameState.board.height - yDistFrom;
      }
      const distFrom = xDistFrom + yDistFrom;

      if (distFrom < 2) {
        possibleMoves[direction] = false;
      }
    }
  }

  /* Avoid hazard sauce. */
  if (numberOfEnabledMoves() > 1) {
    const hazards = gameState.board.hazards;
    for (let i = 0; i < hazards.length; i++) {
      for (const direction of directions) {
        if (
          JSON.stringify(hazards[i]) ===
          JSON.stringify(moveLookAhead(myHead, direction, gameState)) &&
          numberOfEnabledMoves() > 1
        ) {
          possibleMoves[direction] = false;
        }
      }
    }
  }

  /* Find food */
  // Use information in gameState to seek out and find food.
  let food = gameState.board.food;
  // const maxHealth = 100;
  // const minHealthPercentage = 90;
  // If health is less than 50% and there is food and there is more than 1 possible move enabled...
  if ( food.length > 0 && numberOfEnabledMoves() > 1 ) {
    // Filter out food in hazard sauce. (Ignore food in hazard sauce)
    const hazards = gameState.board.hazards;
    if (0 !== hazards.length) {
      food = food.filter((snack) => {
        for (let i = 0; i < hazards.length; i++) {
          if (JSON.stringify(hazards[i]) === JSON.stringify(snack)) {
            return false;
          }
          return true;
        }
      });
    }

    // Sort all food from closest to furthest.
    food.sort((a, b) => {
      // Find total steps needed from myHead to aFood and to bFood. This is logic specifically trailored for Wrapped mode.

      // Find distance to get to Food A.
      let xDistFromA = Math.abs(myHead.x - a.x);
      if (xDistFromA > gameState.board.width / 2) {
        xDistFromA = gameState.board.width - xDistFromA;
      }
      let yDistFromA = Math.abs(myHead.y - a.y);
      if (yDistFromA > gameState.board.height / 2) {
        yDistFromA = gameState.board.height - yDistFromA;
      }

      // Find distance to get to Food B.
      let xDistFromB = Math.abs(myHead.x - b.x);
      if (xDistFromB > gameState.board.width / 2) {
        xDistFromB = gameState.board.width - xDistFromB;
      }
      let yDistFromB = Math.abs(myHead.y - b.y);
      if (yDistFromB > gameState.board.height / 2) {
        yDistFromB = gameState.board.height - yDistFromB;
      }

      const aDistanceToMe = xDistFromA + yDistFromA;
      const bDistanceToMe = xDistFromB + yDistFromB;
      return aDistanceToMe - bDistanceToMe;
    });

    // Get closest food and disable moves as needed.
    const closestFood = food[0];
    let leftOrRight = myHead.x - closestFood.x;
    let upOrDown = myHead.y - closestFood.y;

    if (gameState.game.ruleset.name === 'wrapped') {
      if (Math.abs(upOrDown) > gameState.board.height / 2) {
        upOrDown *= -1;
      }
      if (Math.abs(leftOrRight) > gameState.board.width / 2) {
        leftOrRight *= -1;
      }
    }

    if (leftOrRight === 0) {
      possibleMoves.right = false;
      if (numberOfEnabledMoves() > 1) {
        possibleMoves.left = false;
      }
    } else if (leftOrRight > 0) {
      possibleMoves.right = false;
    } else if (leftOrRight < 0) {
      possibleMoves.left = false;
    }

    if (numberOfEnabledMoves() > 1) {
      if (upOrDown === 0) {
        possibleMoves.up = false;
        if (numberOfEnabledMoves() > 1) {
          possibleMoves.down = false;
        }
      } else if (upOrDown > 0) {
        possibleMoves.up = false;
      } else if (upOrDown < 0) {
        possibleMoves.down = false;
      }
    }
  }

  // TODO: Step 5 - Select a move to make based on strategy, rather than random.
  const safeMoves = Object.keys(possibleMoves).filter(
    (key) => possibleMoves[key]
  );
  const response = {
    move: safeMoves[Math.floor(Math.random() * safeMoves.length)],
  };

  return response;
}



function moveLookAhead(coord, direction, gameState) {
  const baseDirections = {
    up: {
      x: coord.x,
      y: coord.y + 1,
    },
    down: {
      x: coord.x,
      y: coord.y - 1,
    },
    left: {
      x: coord.x - 1,
      y: coord.y,
    },
    right: {
      x: coord.x + 1,
      y: coord.y,
    },
  };

  const newCoords = baseDirections[direction];

  if (gameState.game.ruleset.name !== 'wrapped') return newCoords;

  if (gameState.board.width === newCoords.x) {
    newCoords.x = 0;
  } else if (-1 === newCoords.x) {
    newCoords.x = gameState.board.width - 1;
  }
  if (gameState.board.height === newCoords.y) {
    newCoords.y = 0;
  } else if (-1 === newCoords.y) {
    newCoords.y = gameState.board.height - 1;
  }

  return newCoords;
}





function paintBucketFill(startingCoords, gameState) {
  const queue = [startingCoords];
  const history = {};
  
  let safeGuard = gameState.board.width * gameState.board.height;
  let counter = 0;
  while(queue.length > 0  && counter < safeGuard) {
    const coords = queue.shift();
    const coordsString = `${coords.x},${coords.y}`;
    if (history[coordsString]) { 
      continue 
    } else {
      history[coordsString] = true;
    } 
    counter++;

    for (const direction of directions){ 
      const lookAheadCoords = moveLookAhead(coords, direction, gameState);
      const lookAheadCoordsString = `${lookAheadCoords.x},${lookAheadCoords.y}`;
      const clear = isClearSpace(lookAheadCoords, gameState, counter)
      if (clear && !history[lookAheadCoordsString]) { 
        queue.push(lookAheadCoords) 
      }
    }
  }

  // Return number of empty spaces.
  return Object.keys(history).length;
}

//@todo basic test for isClearSpace independently
function isClearSpace(coords, gameState, distanceFromEndOfSnakeToStopAt = 0) {
  const outOfBounds = isOutOfBounds(coords,gameState)
  const collided = isCollidedWithSnakes(coords, gameState, distanceFromEndOfSnakeToStopAt);
  return !outOfBounds && !collided
}


function isOutOfBounds(coords,gameState){
  const isWrapped = "wrapped" === gameState.game.ruleset.name;
  if (isWrapped) return false;

  const height = gameState.board.height;
  const width = gameState.board.width;
  if (coords.x < 0 || coords.x >= width) {
    return true;
  } else if (coords.y < 0 || coords.y >= height) {
    return true;
  }
  return false;
 }


 function isCollidedWithSnakes(coords,gameState,distanceFromEndOfSnakeToStopAt){
  for (const snake of gameState.board.snakes) {
    const body = snake.body;
    for (let i = 0; i < body.length - distanceFromEndOfSnakeToStopAt; i++) {
      const part = body[i];
      if (coords.x === part.x  && coords.y === part.y) { 
        return true
      }
    }
  }
  return false;
 }







module.exports = {
  info: info,
  start: start,
  move: move,
  end: end,
  isCollidedWithSnakes,
  paintBucketFill,
  isOutOfBounds
};