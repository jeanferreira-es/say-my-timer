// Ordem das jogadas: a cada turno joga um time diferente, na ordem da tela de
// times. Dentro de cada time os jogadores se revezam; times menores repetem
// seus jogadores, então cada time joga exatamente uma vez por rodada.

export interface Turn {
  round: number;
  // Time da vez. Guardado pelo nome para que a vez continue com o mesmo time
  // quando os times são reordenados ou editados no meio da partida.
  team: string | null;
  // Posição do time na rodada; usada quando o time da vez deixa de existir.
  position: number;
}

export interface TurnPlayer {
  team: string;
  player: string;
}

export const INITIAL_TURN: Turn = { round: 0, team: null, position: 0 };

type ParticipantsByTeam = Record<string, string[]>;

// Times sem jogadores ficam de fora da ordem.
export function getActiveTeams(
  teamOrder: string[],
  participantsByTeam: ParticipantsByTeam,
): string[] {
  return teamOrder.filter(
    (team) => (participantsByTeam[team] ?? []).length > 0,
  );
}

function resolvePosition(turn: Turn, activeTeams: string[]): number {
  const teamPosition = turn.team ? activeTeams.indexOf(turn.team) : -1;
  if (teamPosition >= 0) return teamPosition;
  return Math.min(turn.position, activeTeams.length - 1);
}

export function getTurnPlayer(
  turn: Turn,
  teamOrder: string[],
  participantsByTeam: ParticipantsByTeam,
): TurnPlayer | null {
  const activeTeams = getActiveTeams(teamOrder, participantsByTeam);
  if (!activeTeams.length) return null;
  const team = activeTeams[resolvePosition(turn, activeTeams)];
  const players = participantsByTeam[team];
  return { team, player: players[turn.round % players.length] };
}

export function nextTurn(
  turn: Turn,
  teamOrder: string[],
  participantsByTeam: ParticipantsByTeam,
): Turn {
  const activeTeams = getActiveTeams(teamOrder, participantsByTeam);
  if (!activeTeams.length) return INITIAL_TURN;
  let position = resolvePosition(turn, activeTeams) + 1;
  let round = turn.round;
  if (position >= activeTeams.length) {
    position = 0;
    round += 1;
  }
  return { round, position, team: activeTeams[position] };
}

export function previousTurn(
  turn: Turn,
  teamOrder: string[],
  participantsByTeam: ParticipantsByTeam,
): Turn {
  const activeTeams = getActiveTeams(teamOrder, participantsByTeam);
  if (!activeTeams.length) return INITIAL_TURN;
  let position = resolvePosition(turn, activeTeams) - 1;
  let round = turn.round;
  if (position < 0) {
    if (round === 0) return turn;
    position = activeTeams.length - 1;
    round -= 1;
  }
  return { round, position, team: activeTeams[position] };
}

export function isFirstTurn(
  turn: Turn,
  teamOrder: string[],
  participantsByTeam: ParticipantsByTeam,
): boolean {
  const activeTeams = getActiveTeams(teamOrder, participantsByTeam);
  return turn.round === 0 && (!activeTeams.length || resolvePosition(turn, activeTeams) === 0);
}
