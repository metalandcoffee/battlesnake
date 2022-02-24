const directions = ["up", "down", "left", "right"]

function info() {
  console.log("INIT");
  const response = {
    apiversion: "1",
    author: "",
    color: "#4B0082",
    head: "bendr",
    tail: "freckled",
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

  function moveLookAhead(snakeHead, direction) {
    const baseDirections = {
      up: {
        x: snakeHead.x,
        y: snakeHead.y + 1
      },
      down: {
        x: snakeHead.x,
        y: snakeHead.y - 1,
      },
      left: {
        x: snakeHead.x - 1,
        y: snakeHead.y,
      },
      right: {
        x: snakeHead.x + 1,
        y: snakeHead.y,
      }
    }
    const baseDirection = baseDirections[direction];

    if (gameState.game.ruleset.name !== "wrapped") return baseDirection;

    if (gameState.board.width === baseDirection.x) {
      baseDirection.x = 0;
    } else if (-1 === baseDirection.x) {
      baseDirection.x = gameState.board.width - 1;
    }
    if (gameState.board.height === baseDirection.y) {
      baseDirection.y = 0;
    } else if (-1 === baseDirection.y) {
      baseDirection.y = gameState.board.height - 1;
    }

    return baseDirection
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
  /* Don't hit the walls */
  if ('wrapped' !== gameState.game.ruleset.name) {

    // If myHead.x is at the beginning of the x axis,
    // turn off "left" as possible move.
    if (myHead.x === 0) {
      possibleMoves.left = false
      // If myHead.x is at the end of the x axis,
      // turn off "right" as possible move.
    } else if (myHead.x === gameState.board.width - 1) {
      possibleMoves.right = false
    }
    // If myHead.y is at the beginning of the y axis,
    // turn off "down" as possible move.
    if (myHead.y === 0) {
      possibleMoves.down = false
      // If myHead.y is at the end of the y axis,
      // turn off "up" as possible move.
    } else if (myHead.y === gameState.board.height - 1) {
      possibleMoves.up = false
    }
  }


  /* Don't hit yourself or others. */
  // Use information in gameState to prevent your Battlesnake from colliding with itself.

  for (const snake of gameState.board.snakes) {
    for (let i = 0; i < snake.length - 1; i++) {

      for (const direction of directions) {
        if (
          //  {x:0,y:0} {y:0,x:0} properties aren't always in the same order.. update
          JSON.stringify(snake.body[i]) === JSON.stringify(moveLookAhead(myHead, direction))
        ) {
          possibleMoves[direction] = false;
        }


      }
    }
  }

  /* Avoid loser snake heads that are adjacent to possible moves. */
  // If losersnake's head is 1 distance away from one of my possible moves, disable move.
  // @todo update logic to check if I am stronger than snake first before avoiding.
  let loserSnakes = gameState.board.snakes.filter(snake => snake.id !== gameState.you.id).map((snake) => snake.head);
  for (let i = 0; i < loserSnakes.length; i++) {
    for (const direction of directions) {
      // Find distance from possible move to losersnake's head.
      let xDistFrom = Math.abs(moveLookAhead(myHead, direction).x - loserSnakes[i].x);
      if (xDistFrom > gameState.board.width / 2) {
        xDistFrom = gameState.board.width - xDistFrom;
      }
      let yDistFrom = Math.abs(moveLookAhead(myHead, direction).y - loserSnakes[i].y);
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
          JSON.stringify(moveLookAhead(myHead, direction)) &&
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

  // If there is food and there is more than 1 possible move enabled...
  if (food.length > 0 && numberOfEnabledMoves() > 1) {
    // Filter out food in hazard sauce.
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

    // if (safeFood.length !== 0) {
    //   food = safeFood;
    // }

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

      //tmp[JSON.stringify(a)] = { x: xDistFromA, y: yDistFromA };
      //tmp[JSON.stringify(b)] = { x: xDistFromB, y: yDistFromB };

      const aDistanceToMe = xDistFromA + yDistFromA;
      const bDistanceToMe = xDistFromB + yDistFromB;
      return aDistanceToMe - bDistanceToMe;
    });

    // Get closest food and disable moves as needed.
    const closestFood = food[0];
    const leftOrRight = myHead.x - closestFood.x;
    const topOrBottom = myHead.y - closestFood.y;
    if (leftOrRight > 0) {
      possibleMoves.right = false;
    } else if (leftOrRight < 0) {
      possibleMoves.left = false;
    }

    if (numberOfEnabledMoves() > 1) {
      if (topOrBottom > 0) {
        possibleMoves.up = false;
      } else if (topOrBottom < 0) {
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

module.exports = {
  info: info,
  start: start,
  move: move,
  end: end,
};
