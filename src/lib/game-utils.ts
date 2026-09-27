/**
 * Snooker Game & Team Display Utilities
 */

export function getDoubleTeams(players: string[]): {
  team1Label: string;
  team2Label: string;
  team1Players: [string, string];
  team2Players: [string, string];
} {
  const p1 = players[0]?.trim() || "Player 1";
  const p2 = players[1]?.trim() || "Player 2";
  const p3 = players[2]?.trim() || "Player 3";
  const p4 = players[3]?.trim() || "Player 4";

  return {
    team1Label: `Team 1 (${p1} & ${p2})`,
    team2Label: `Team 2 (${p3} & ${p4})`,
    team1Players: [p1, p2],
    team2Players: [p3, p4],
  };
}

export function formatGamePlayers(game: {
  type: string;
  players: string[];
}): string {
  if (!game || !game.players || game.players.length === 0) {
    return "Unknown Players";
  }

  if (game.type === "double" && game.players.length >= 4) {
    const { team1Label, team2Label } = getDoubleTeams(game.players);
    return `${team1Label}  vs  ${team2Label}`;
  }

  if (game.type === "century") {
    if (game.players.length === 1) {
      return game.players[0] || "Solo Break Builder";
    }
    return `${game.players.join(", ")} (${game.players.length} Players)`;
  }

  return game.players.join("  vs  ");
}
