function info() {
    console.log("INIT")
    const response = {
        apiversion: "1",
        author: "",
        color: "#4B0082",
        head: "bendr",
        tail: "freckled"
    }
    return response
}

function start(gameState) {
    console.log(`${gameState.game.id} START`)
}

function end(gameState) {
    console.log(`${gameState.game.id} END\n`)
}

function move(gameState) {
  const myHead = gameState.you.head
  const myNeck = gameState.you.body[1]

  let possibleMoves = {
      up: true,
      down: true,
      left: true,
      right: true
  }

  function numberOfEnabledMoves() {
    return Object.values(possibleMoves).filter(enabled => enabled === true).length
  }

  let moveLookAhead = {
      up: { x: myHead.x, y: myHead.y + 1 },
      down: { x: myHead.x, y: myHead.y - 1 },
      left: { x: myHead.x - 1, y: myHead.y },
      right: { x: myHead.x + 1, y: myHead.y },
  };

    // Don't let your Battlesnake move back on its own neck
    if (myNeck.x < myHead.x) {
        possibleMoves.left = false
    } else if (myNeck.x > myHead.x) {
        possibleMoves.right = false
    } else if (myNeck.y < myHead.y) {
        possibleMoves.down = false
    } else if (myNeck.y > myHead.y) {
        possibleMoves.up = false
    }

    /* Don't hit walls. */
    const boardWidth = gameState.board.width
    const boardHeight = gameState.board.height

    // If myHead.x is at the beginning of the x axis,
    // turn off "left" as possible move.
    if ( myHead.x === 0 ) {
      possibleMoves.left = false
    // If myHead.x is at the end of the x axis,
    // turn off "right" as possible move.
    } else if ( myHead.x === gameState.board.width - 1 ) {
      possibleMoves.right = false
    }
    // If myHead.y is at the beginning of the y axis,
    // turn off "down" as possible move.
    if ( myHead.y === 0 ) {
      possibleMoves.down = false
    // If myHead.y is at the end of the y axis,
    // turn off "up" as possible move.
    } else if ( myHead.y === gameState.board.height - 1 ) {
      possibleMoves.up = false
    }

    console.log(possibleMoves)
    console.log(numberOfEnabledMoves())

    /* Don't hit yourself. */
    // Use information in gameState to prevent your Battlesnake from colliding with itself.
    const myBody = gameState.you.body
    for (let i = 0; i < myBody.length; i++) {
      for (const direction in moveLookAhead) {
        if (JSON.stringify(myBody[i]) === JSON.stringify(moveLookAhead[direction])) {
          possibleMoves[direction] = false;
        }
      }
    }

    console.log(possibleMoves)
    console.log(numberOfEnabledMoves())

    // Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with others.
    const loserSnakes = gameState.board.snakes.map( snake => snake.body)
    for (let snakeParts of loserSnakes) {
      for (let i = 0; i < snakeParts.length; i++) {
        for (const direction in moveLookAhead) {
          if (JSON.stringify(snakeParts[i]) === JSON.stringify(moveLookAhead[direction])) {
            possibleMoves[direction] = false
          }
        }
      }
    }

    console.log(possibleMoves)
    console.log(numberOfEnabledMoves())

    // Step 4 - Find food.
    // Use information in gameState to seek out and find food.
    const food = gameState.board.food

    // Grab closest food and disable directions that would take you further away from it.
    // If there is food and there is more than 1 possible move enabled...
    if ( food.length > 0 && numberOfEnabledMoves() > 1 ) {
      food.sort( (a,b) => {
        // Find sum of differences between my snake and food (x & y coordinates). The lowest sum will be the closest food.
        const aDistanceToMe = Math.abs(myHead.x - a.x) + Math.abs(myHead.y - a.y)
        const bDistanceToMe = Math.abs(myHead.x - b.x) + Math.abs(myHead.y - b.y)
        return aDistanceToMe - bDistanceToMe
      })
      const closestFood = food[0] 
      const leftOrRight = myHead.x - closestFood.x;
      const topOrBottom = myHead.y - closestFood.y;
      if ( leftOrRight >= 0 ) {
        possibleMoves.right = false
      } else {
        possibleMoves.left = false
      }
      if ( topOrBottom >= 0 ) {
        possibleMoves.up = false
      } else {
        possibleMoves.down = false
      }
    }

    console.log(possibleMoves)
    console.log(numberOfEnabledMoves())
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.
    const safeMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key])
    const response = {
        move: safeMoves[Math.floor(Math.random() * safeMoves.length)],
    }

    console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`)
    // console.log(gameState.board);
    // console.log(gameState.you.head);
    //console.log(moveLookAhead)
    //console.log(gameState.you.body)
    return response
}

module.exports = {
    info: info,
    start: start,
    move: move,
    end: end
}
