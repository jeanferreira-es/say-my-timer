// Regras de nomes de times e jogadores, compartilhadas por todas as telas.

export function normalizePlayerName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function sameName(a: string, b: string): boolean {
  return normalizePlayerName(a) === normalizePlayerName(b);
}

// Time em que o jogador está, ignorando o time `exceptTeam`.
export function findPlayerTeam(
  participantsByTeam: Record<string, string[]>,
  playerName: string,
  exceptTeam?: string,
): string | null {
  for (const [team, players] of Object.entries(participantsByTeam)) {
    if (team === exceptTeam) continue;
    if (players.some((player) => sameName(player, playerName))) return team;
  }
  return null;
}

// Retorna a mensagem de erro, ou null se a lista de jogadores do time é válida.
export function validateTeamPlayers(
  participantsByTeam: Record<string, string[]>,
  teamName: string,
  players: string[],
): string | null {
  const seen: string[] = [];
  for (const raw of players) {
    const player = raw.trim();
    if (!player) return "O nome do jogador não pode ficar vazio";
    if (seen.some((existing) => sameName(existing, player))) {
      return `${player} aparece repetido no time`;
    }
    const otherTeam = findPlayerTeam(participantsByTeam, player, teamName);
    if (otherTeam) return `${player} já está no time ${otherTeam}`;
    seen.push(player);
  }
  return null;
}

export function validateTeamName(
  teamNames: string[],
  nextName: string,
  currentName?: string,
): string | null {
  const name = nextName.trim();
  if (!name) return "Informe o nome do time";
  const taken = teamNames.some(
    (team) => team !== currentName && sameName(team, name),
  );
  return taken ? `Já existe um time chamado ${name}` : null;
}

// Primeiro "Time NN" livre, a partir da quantidade atual de times + 1.
export function nextDefaultTeamName(teamNames: string[]): string {
  for (let n = teamNames.length + 1; ; n++) {
    const name = `Time ${String(n).padStart(2, "0")}`;
    if (!teamNames.some((team) => sameName(team, name))) return name;
  }
}
