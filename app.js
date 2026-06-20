const state = {
  mode: null,
  entryGameType: "americano",
  entryPeople: 6,
  entryCourts: 2,
  entryStep: 1,
  setupStep: 1,
  sessionStarted: false,
  players: [],
  teams: [],
  matches: [],
  editingMatchIndex: null,
  currentTeams: [0, 1],
  waitingTeam: 2,
  waitingTeams: [],
  fixedStreaks: {},
  rotationRound: 0,
  matchReady: true,
  streakTeam: null,
  streak: 0,
  padel: {
    points: [0, 0],
    games: [0, 0],
    sets: [],
  },
  americanoRounds: [],
  roundIndex: 0,
  finalizedResult: null,
};

const SESSION_STORAGE_KEY = "padelScoreSession";
const SESSION_STORAGE_VERSION = 2;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const modeConfig = {
  "4": {
    title: "4-player Standard",
    note: "Two fixed pairs. Add games or sets and finalize the pair result.",
    count: 4,
    type: "standard",
  },
  "6": {
    title: "6-player Fixed Teams",
    note: "Pick three pairs, generate matches, then enter scores to 21. Winners stay for up to two matches.",
    count: 6,
    type: "fixed",
  },
  "R8": {
    title: "8-player Fixed Teams",
    note: "Four pairs rotate across two courts.",
    count: 8,
    type: "fixed",
  },
  "A6": {
    title: "6-player Americano",
    note: "Americano scoring to 21 with generated pairs.",
    count: 6,
    type: "americano",
  },
  "8": {
    title: "8-player Americano",
    note: "Seven rounds. Every player partners once with every other player.",
    count: 8,
    type: "americano",
  },
  "P8": {
    title: "8-player Standard",
    note: "Two courts with fixed pairs.",
    count: 8,
    type: "standard",
  },
};

const gameTypeOptions = {
  4: [{ value: "standard", label: "Standard" }],
  6: [
    { value: "fixed", label: "Fixed Teams" },
    { value: "americano", label: "Americano" },
  ],
  8: [
    { value: "americano", label: "Americano" },
    { value: "fixed", label: "Fixed Teams" },
    { value: "standard", label: "Standard" },
  ],
};

const defaultGameTypeByPeople = {
  4: "standard",
  6: "americano",
  8: "americano",
};

const els = {
  entryScreen: document.querySelector("#entryScreen"),
  entryFirstStep: document.querySelector("#entryFirstStep"),
  entryNamesStep: document.querySelector("#entryNamesStep"),
  entryNames: document.querySelector("#entryNames"),
  gameTypeSelect: document.querySelector("#gameTypeSelect"),
  courtsField: document.querySelector("#courtsField"),
  courtsSelect: document.querySelector("#courtsSelect"),
  entryNextBtn: document.querySelector("#entryNextBtn"),
  entryBackBtn: document.querySelector("#entryBackBtn"),
  entryStartBtn: document.querySelector("#entryStartBtn"),
  entryMessage: document.querySelector("#entryMessage"),
  workspace: document.querySelector("#workspace"),
  setupPanel: document.querySelector("#setupPanel"),
  setupSubtitle: document.querySelector("#setupSubtitle"),
  setupSteps: document.querySelector("#setupSteps"),
  setupContent: document.querySelector("#setupContent"),
  modeTitle: document.querySelector("#modeTitle"),
  modeNote: document.querySelector("#modeNote"),
  currentMatch: document.querySelector("#currentMatch"),
  padelPanel: document.querySelector("#padelPanel"),
  parallelPanel: document.querySelector("#parallelPanel"),
  scoreForm: document.querySelector("#scoreForm"),
  scoreA: document.querySelector("#scoreA"),
  scoreB: document.querySelector("#scoreB"),
  scoreTotal: document.querySelector("#scoreTotal"),
  scoreTargetLabel: document.querySelector("#scoreTargetLabel"),
  teamALabel: document.querySelector("#teamALabel"),
  teamBLabel: document.querySelector("#teamBLabel"),
  calculateBtn: document.querySelector("#calculateBtn"),
  standings: document.querySelector("#standings"),
  matchLog: document.querySelector("#matchLog"),
  matchCount: document.querySelector("#matchCount"),
  schedulePanel: document.querySelector("#schedulePanel"),
  resetBtn: document.querySelector("#resetBtn"),
  clearSessionBtn: document.querySelector("#clearSessionBtn"),
  resetDialog: document.querySelector("#resetDialog"),
  confirmResetBtn: document.querySelector("#confirmResetBtn"),
  cancelResetBtn: document.querySelector("#cancelResetBtn"),
  generateMatchBtn: document.querySelector("#generateMatchBtn"),
  formMessage: document.querySelector("#formMessage"),
};

function defaultPlayers(count) {
  return Array.from({ length: count }, (_, index) => `Player ${index + 1}`);
}

function defaultTeams(mode) {
  if (isAmericanoMode(mode)) return [];
  const count = modeConfig[mode]?.count || state.players.length;
  return Array.from({ length: Math.floor(count / 2) }, (_, index) => [index * 2, index * 2 + 1])
    .filter((team) => team.every((playerIndex) => playerIndex < state.players.length));
}

function initialWaitingTeams(mode) {
  if (mode === "R8") return [2, 3];
  if (mode === "6") return [2];
  return [];
}

function initMode(mode, keepNames = false) {
  state.mode = mode;
  state.setupStep = 1;
  state.sessionStarted = false;
  const count = modeConfig[mode].count;
  const oldPlayers = state.players;
  state.players = keepNames
    ? Array.from({ length: count }, (_, index) => oldPlayers[index] || `Player ${index + 1}`)
    : defaultPlayers(count);
  state.teams = defaultTeams(mode);
  state.matches = [];
  state.finalizedResult = null;
  state.currentTeams = [0, 1];
  state.waitingTeam = 2;
  state.waitingTeams = initialWaitingTeams(mode);
  state.fixedStreaks = {};
  state.rotationRound = 0;
  state.matchReady = true;
  state.streakTeam = null;
  state.streak = 0;
  resetPadelScore();
  state.roundIndex = 0;
  state.americanoRounds = isAmericanoMode(mode) ? buildAmericanoRounds() : [];
  render();
}

function resetSession(keepNames = true) {
  const mode = state.mode;
  if (!mode) {
    resetToEntry();
    return;
  }
  const oldPlayers = state.players;
  const count = modeConfig[mode].count;
  state.players = keepNames
    ? Array.from({ length: count }, (_, index) => oldPlayers[index] || `Player ${index + 1}`)
    : defaultPlayers(count);
  state.teams = defaultTeams(mode);
  state.matches = [];
  state.finalizedResult = null;
  state.currentTeams = [0, 1];
  state.waitingTeam = 2;
  state.waitingTeams = initialWaitingTeams(mode);
  state.fixedStreaks = {};
  state.rotationRound = 0;
  state.matchReady = true;
  state.streakTeam = null;
  state.streak = 0;
  resetPadelScore();
  state.roundIndex = 0;
  state.americanoRounds = isAmericanoMode(mode) ? buildAmericanoRounds() : [];
  state.sessionStarted = false;
  state.setupStep = 1;
  render();
}

function saveSession() {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: SESSION_STORAGE_VERSION,
      expiresAt: Date.now() + SESSION_TTL_MS,
      state,
    }));
  } catch {
    // Storage can be unavailable in private mode or locked-down browsers.
  }
}

function clearSavedSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function restoreSavedSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
    if (!saved || saved.version !== SESSION_STORAGE_VERSION || saved.expiresAt <= Date.now() || !saved.state) {
      clearSavedSession();
      return false;
    }

    Object.assign(state, saved.state);
    normalizeSessionState();
    return true;
  } catch {
    clearSavedSession();
    return false;
  }
}

function normalizeSessionState() {
  state.entryPeople = Number(state.entryPeople);
  if (![4, 6, 8].includes(state.entryPeople)) state.entryPeople = 6;

  state.entryCourts = Number(state.entryCourts);
  if (![1, 2].includes(state.entryCourts)) state.entryCourts = state.entryPeople === 8 ? 2 : 1;

  const options = gameTypeOptions[state.entryPeople] || gameTypeOptions[6];
  if (!options.some((option) => option.value === state.entryGameType)) {
    state.entryGameType = defaultGameTypeByPeople[state.entryPeople] || options[0].value;
  }
  if (state.entryPeople === 8 && state.entryGameType === "standard") state.entryCourts = 2;
  if (state.entryPeople !== 8) state.entryCourts = 1;

  if (!modeConfig[state.mode]) state.mode = null;
  if (!Array.isArray(state.players)) state.players = [];
  if (!Array.isArray(state.teams)) state.teams = [];
  if (!Array.isArray(state.matches)) state.matches = [];
  if (!Array.isArray(state.waitingTeams)) state.waitingTeams = [];
  if (!Array.isArray(state.americanoRounds)) state.americanoRounds = [];
  if (!state.padel || !Array.isArray(state.padel.points) || !Array.isArray(state.padel.games) || !Array.isArray(state.padel.sets)) {
    resetPadelScore();
  }

  if (state.mode) {
    const count = modeConfig[state.mode].count;
    state.players = Array.from({ length: count }, (_, index) => state.players[index] || `Player ${index + 1}`);

    if (isAmericanoMode()) {
      state.teams = [];
      state.americanoRounds = buildAmericanoRounds();
      state.roundIndex = Math.min(Number(state.roundIndex) || 0, state.americanoRounds.length);
    } else {
      const expectedTeams = Math.floor(count / 2);
      if (state.teams.length !== expectedTeams || !teamsAreValid()) {
        state.teams = defaultTeams(state.mode);
      }
      state.currentTeams = Array.isArray(state.currentTeams) && state.currentTeams.length === 2 ? state.currentTeams : [0, 1];
      state.waitingTeams = state.waitingTeams.filter((teamIndex) => state.teams[teamIndex]);
      if (!state.waitingTeams.length) state.waitingTeams = initialWaitingTeams(state.mode);
    }
  }
}

function clearFinalizedResult() {
  state.finalizedResult = null;
}

function resetToEntry() {
  clearSavedSession();
  state.mode = null;
  state.entryGameType = "americano";
  state.entryPeople = 6;
  state.entryCourts = 2;
  state.entryStep = 1;
  state.setupStep = 1;
  state.sessionStarted = false;
  state.players = [];
  state.teams = [];
  state.matches = [];
  clearFinalizedResult();
  state.waitingTeams = [];
  state.fixedStreaks = {};
  state.editingMatchIndex = null;
  state.americanoRounds = [];
  resetPadelScore();
  state.roundIndex = 0;
  if (els.entryNames) {
    els.entryNames.querySelectorAll("input").forEach((input) => {
      input.value = "";
    });
  }
  if (els.entryMessage) els.entryMessage.textContent = "";
  render();
  clearSavedSession();
}

function openResetDialog() {
  els.resetDialog.hidden = false;
  els.confirmResetBtn.focus();
}

function closeResetDialog() {
  els.resetDialog.hidden = true;
}

function confirmResetSession() {
  closeResetDialog();
  resetToEntry();
}

function isAmericanoMode(mode = state.mode) {
  return modeConfig[mode]?.type === "americano";
}

function isStandardMode(mode = state.mode) {
  return modeConfig[mode]?.type === "standard";
}

function teamName(team) {
  return team.map((index) => playerDisplayName(index)).join(" / ");
}

function teamNameHtml(team) {
  return team
    .map((index) => `<span>${escapeHtml(playerDisplayName(index))}</span>`)
    .join("");
}

function activeMatch() {
  if (isAmericanoMode()) {
    const round = state.americanoRounds[state.roundIndex] || null;
    if (round && state.entryCourts === 2 && round.waiting?.length >= 2) {
      return {
        ...round,
        courtTwo: {
          teamA: round.waiting[0],
          teamB: round.waiting[1],
        },
      };
    }
    return round;
  }

  if (state.mode === "P8") {
    const match = {
      teamA: state.teams[0],
      teamB: state.teams[1],
      label: "Court 1",
    };
    if (state.entryCourts === 2) {
      match.courtTwo = {
        teamA: state.teams[2],
        teamB: state.teams[3],
      };
    }
    return match;
  }

  if (state.mode === "R8") {
    if (state.entryCourts === 1) {
      return {
        teamA: state.teams[state.currentTeams[0]],
        teamB: state.teams[state.currentTeams[1]],
        waiting: state.waitingTeams.map((teamIndex) => state.teams[teamIndex]),
        label: `Match ${state.matches.length + 1}`,
      };
    }

    const rounds = [
      [[0, 1], [2, 3]],
      [[0, 2], [1, 3]],
      [[0, 3], [1, 2]],
    ];
    const round = rounds[state.rotationRound % rounds.length];
    const match = {
      teamA: state.teams[state.rotationRound % 2 === 0 ? round[0][0] : round[1][0]],
      teamB: state.teams[state.rotationRound % 2 === 0 ? round[0][1] : round[1][1]],
      label: `Round ${state.rotationRound + 1} · Court 1`,
    };
    if (state.entryCourts === 2) {
      match.courtTwo = {
        teamA: state.teams[state.rotationRound % 2 === 0 ? round[1][0] : round[0][0]],
        teamB: state.teams[state.rotationRound % 2 === 0 ? round[1][1] : round[0][1]],
      };
    }
    return match;
  }

  return {
    teamA: state.teams[state.currentTeams[0]],
    teamB: state.teams[state.currentTeams[1]],
    label: state.mode === "6" ? `Match ${state.matches.length + 1}` : "Current match",
  };
}

function buildAmericanoRounds() {
  const count = modeConfig[state.mode]?.count || state.players.length;
  const players = Array.from({ length: count }, (_, index) => index);
  const rounds = [];
  const usedPartnerPairs = new Set();
  let rotating = players.slice(1);

  const partnerKey = (team) => [...team].sort((a, b) => a - b).join("-");
  const addRound = (roundConfig, activeWaiting = false) => {
    const activePairs = [roundConfig.teamA, roundConfig.teamB];
    if (activeWaiting) activePairs.push(...roundConfig.waiting);

    if (activePairs.some((team) => usedPartnerPairs.has(partnerKey(team)))) return;
    activePairs.forEach((team) => usedPartnerPairs.add(partnerKey(team)));
    rounds.push(roundConfig);
  };

  for (let round = 0; round < count - 1; round += 1) {
    const order = [players[0], ...rotating];
    const pairs = [];
    for (let index = 0; index < count / 2; index += 1) {
      pairs.push([order[index], order[count - 1 - index]]);
    }

    if (count === 6) {
      const waitingIndex = round % pairs.length;
      const playingPairs = pairs.filter((_, index) => index !== waitingIndex);
      addRound({
        label: `Round ${round + 1}`,
        teamA: playingPairs[0],
        teamB: playingPairs[1],
        waiting: [pairs[waitingIndex]],
      });
    } else if (state.entryCourts === 1) {
      addRound({
        label: `Round ${round + 1} · Game 1`,
        teamA: pairs[0],
        teamB: pairs[1],
        waiting: [pairs[2], pairs[3]],
      });
      addRound({
        label: `Round ${round + 1} · Game 2`,
        teamA: pairs[2],
        teamB: pairs[3],
        waiting: [pairs[0], pairs[1]],
      });
    } else if (count === 8) {
      const courtOnePairs = round % 2 === 0 ? [pairs[0], pairs[1]] : [pairs[2], pairs[3]];
      const courtTwoPairs = round % 2 === 0 ? [pairs[2], pairs[3]] : [pairs[0], pairs[1]];
      addRound({
        label: `Round ${round + 1}`,
        teamA: courtOnePairs[0],
        teamB: courtOnePairs[1],
        waiting: courtTwoPairs,
      }, true);
    } else {
      addRound({
        label: `Round ${round + 1}`,
        teamA: pairs[0],
        teamB: pairs[1],
        waiting: pairs.slice(2),
      });
    }

    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return rounds;
}

function updatePlayer(index, value) {
  state.players[index] = value;
  if (isAmericanoMode()) state.americanoRounds = buildAmericanoRounds();
  clearFinalizedResult();
  saveSession();
  renderMatchOnly();
}

function updateTeam(teamIndex, slot, value) {
  const selected = Number(value);
  state.teams[teamIndex][slot] = selected;
  if (state.teams[teamIndex][0] === state.teams[teamIndex][1]) {
    state.teams[teamIndex][slot === 0 ? 1 : 0] = firstAvailablePlayer([selected]);
  }
  clearFinalizedResult();
  saveSession();
  renderMatchOnly();
  renderSetupWizard();
}

function firstAvailablePlayer(excluded) {
  return state.players.findIndex((_, index) => !excluded.includes(index));
}

function addMatch(event) {
  event.preventDefault();
  clearMessage();

  if (!state.sessionStarted) {
    showMessage("Finish setup before scoring.");
    return;
  }

  if (!teamsAreValid()) {
    showMessage("Each selected team needs two different players, and every player can be used once.");
    return;
  }

  const scoreA = Number(els.scoreA.value);
  const scoreB = Number(els.scoreB.value);
  if (!scoresAreValid(scoreA, scoreB)) return;

  const match = activeMatch();
  if (!match) {
    showMessage("Generate the next match before adding a score.");
    return;
  }

  clearFinalizedResult();
  state.matches.push({
    mode: state.mode,
    label: match.label,
    teamA: [...match.teamA],
    teamB: [...match.teamB],
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? "A" : "B",
  });

  if (state.mode === "6" || (state.mode === "R8" && state.entryCourts === 1)) {
    rotateFixedTeams(scoreA > scoreB ? state.currentTeams[0] : state.currentTeams[1]);
    state.matchReady = true;
  }
  if (state.mode === "R8" && state.entryCourts === 2) {
    state.rotationRound += 1;
    state.matchReady = true;
  }
  if (isAmericanoMode()) state.roundIndex = Math.min(state.roundIndex + 1, state.americanoRounds.length);

  els.scoreA.value = "";
  els.scoreB.value = "";
  render();
}

function addParallelMatches() {
  clearMessage();
  const match = activeMatch();
  if (!match?.courtTwo) return;

  const scores = ["court1A", "court1B", "court2A", "court2B"].map((id) => Number(document.querySelector(`#${id}`)?.value));
  if (scores.some((score) => !Number.isFinite(score) || score < 0)) {
    showMessage("Enter valid scores.");
    return;
  }

  const [court1A, court1B, court2A, court2B] = scores;
  if (!scoresAreValid(court1A, court1B) || !scoresAreValid(court2A, court2B)) return;

  clearFinalizedResult();
  state.matches.push({
    mode: state.mode,
    label: `${match.label} · Court 1`,
    teamA: [...match.teamA],
    teamB: [...match.teamB],
    scoreA: court1A,
    scoreB: court1B,
    winner: court1A > court1B ? "A" : "B",
  });
  state.matches.push({
    mode: state.mode,
    label: `${match.label} · Court 2`,
    teamA: [...match.courtTwo.teamA],
    teamB: [...match.courtTwo.teamB],
    scoreA: court2A,
    scoreB: court2B,
    winner: court2A > court2B ? "A" : "B",
  });

  if (state.mode === "R8") {
    state.rotationRound += 1;
    state.matchReady = true;
  }
  if (isAmericanoMode()) state.roundIndex = Math.min(state.roundIndex + 1, state.americanoRounds.length);

  render();
}

function addSingleCourtMatch() {
  clearMessage();
  const match = activeMatch();
  const scoreA = Number(document.querySelector("#singleScoreA")?.value);
  const scoreB = Number(document.querySelector("#singleScoreB")?.value);

  if (!match || !scoresAreValid(scoreA, scoreB)) return;

  clearFinalizedResult();
  state.matches.push({
    mode: state.mode,
    label: match.label,
    teamA: [...match.teamA],
    teamB: [...match.teamB],
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? "A" : "B",
  });

  if (state.mode === "6" || (state.mode === "R8" && state.entryCourts === 1)) {
    rotateFixedTeams(scoreA > scoreB ? state.currentTeams[0] : state.currentTeams[1]);
    state.matchReady = true;
  }
  if (state.mode === "R8" && state.entryCourts === 2) {
    state.rotationRound += 1;
    state.matchReady = true;
  }
  if (isAmericanoMode()) state.roundIndex = Math.min(state.roundIndex + 1, state.americanoRounds.length);

  render();
}

function editMatch(matchIndex) {
  state.editingMatchIndex = matchIndex;
  renderLog();
}

function saveEditedMatch(matchIndex) {
  const match = state.matches[matchIndex];
  const scoreA = Number(document.querySelector(`[data-edit-score-a="${matchIndex}"]`)?.value);
  const scoreB = Number(document.querySelector(`[data-edit-score-b="${matchIndex}"]`)?.value);

  if (!match || !editedScoresAreValid(match, scoreA, scoreB)) return;

  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.winner = scoreA > scoreB ? "A" : "B";
  match.setScore = `${scoreA}-${scoreB}`;
  state.editingMatchIndex = null;
  clearFinalizedResult();
  syncPadelSetsFromMatches();
  render();
}

function editedScoresAreValid(match, scoreA, scoreB) {
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA < 0 || scoreB < 0) {
    showMessage("Enter valid scores.");
    return false;
  }

  if (scoreA === scoreB) {
    showMessage("A match cannot end in a tie.");
    return false;
  }

  if (matchNeedsTwentyOne(match) && scoreA + scoreB !== 21) {
    showMessage("Total must be 21.");
    return false;
  }

  return true;
}

function matchNeedsTwentyOne(match) {
  return match.mode === "6" || match.mode === "R8" || match.mode === "A6" || match.mode === "8";
}

function syncPadelSetsFromMatches() {
  if (!isPadelScoreMode()) return;
  state.padel.sets = state.matches
    .filter((match) => match.mode === "4" || match.mode === "P8")
    .map((match) => [match.scoreA, match.scoreB]);
}

function addPadelPoint(teamIndex) {
  if (!state.sessionStarted || !isPadelScoreMode()) return;

  const otherIndex = teamIndex === 0 ? 1 : 0;
  const points = state.padel.points;

  if (points[teamIndex] <= 2) {
    points[teamIndex] += 1;
  } else if (points[teamIndex] === 3 && points[otherIndex] < 3) {
    winPadelGame(teamIndex);
    return;
  } else if (points[teamIndex] === 3 && points[otherIndex] === 3) {
    points[teamIndex] = 4;
  } else if (points[teamIndex] === 4) {
    winPadelGame(teamIndex);
    return;
  } else if (points[otherIndex] === 4) {
    points[otherIndex] = 3;
  }

  renderPadelPanel();
}

function addSingleCourtPadelSet() {
  clearMessage();
  const match = activeMatch();
  const scoreA = Number(document.querySelector("#padelSetA")?.value);
  const scoreB = Number(document.querySelector("#padelSetB")?.value);

  if (!match || !padelSetScoresAreValid(scoreA, scoreB)) return;

  clearFinalizedResult();
  state.padel.sets.push([scoreA, scoreB]);
  state.matches.push({
    mode: "4",
    label: `Set ${state.padel.sets.length}`,
    teamA: [...match.teamA],
    teamB: [...match.teamB],
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? "A" : "B",
    setScore: `${scoreA}-${scoreB}`,
  });
  render();
}

function winPadelGame(teamIndex) {
  state.padel.games[teamIndex] += 1;
  state.padel.points = [0, 0];

  if (setIsComplete()) {
    clearFinalizedResult();
    state.padel.sets.push([...state.padel.games]);
    state.matches.push({
      mode: "4",
      label: `Set ${state.padel.sets.length}`,
      teamA: [...state.teams[0]],
      teamB: [...state.teams[1]],
      scoreA: state.padel.games[0],
      scoreB: state.padel.games[1],
      winner: state.padel.games[0] > state.padel.games[1] ? "A" : "B",
      setScore: `${state.padel.games[0]}-${state.padel.games[1]}`,
    });
    state.padel.games = [0, 0];
    renderLog();
  }

  renderPadelPanel();
}

function setIsComplete() {
  const [a, b] = state.padel.games;
  const leader = Math.max(a, b);
  const diff = Math.abs(a - b);
  return (leader >= 6 && diff >= 2) || leader === 7;
}

function padelSetScoresAreValid(scoreA, scoreB) {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    showMessage("Enter valid games.");
    return false;
  }

  if (scoreA === scoreB) {
    showMessage("A set cannot end in a tie.");
    return false;
  }

  const leader = Math.max(scoreA, scoreB);
  const trailer = Math.min(scoreA, scoreB);
  const diff = leader - trailer;
  if (!((leader === 6 && diff >= 2) || (leader === 7 && (trailer === 5 || trailer === 6)))) {
    showMessage("Enter a valid padel set score.");
    return false;
  }

  return true;
}

function undoPadelPoint() {
  if (!isPadelScoreMode()) return;
  resetPadelScore();
  state.matches = state.matches.filter((match) => match.mode !== "4");
  clearFinalizedResult();
  render();
}

function resetPadelScore() {
  state.padel = {
    points: [0, 0],
    games: [0, 0],
    sets: [],
  };
}

function scoresAreValid(scoreA, scoreB) {
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA < 0 || scoreB < 0) {
    showMessage("Enter valid positive scores.");
    return false;
  }

  if (scoreA === scoreB) {
    showMessage("A match cannot end in a tie.");
    return false;
  }

  if ((state.mode === "6" || state.mode === "R8" || isAmericanoMode()) && scoreA + scoreB !== 21) {
    showMessage("For 6-player and Americano matches, the total score must be 21.");
    return false;
  }

  return true;
}

function teamsAreValid() {
  if (isAmericanoMode()) return true;
  const selected = state.teams.flat();
  return selected.length === new Set(selected).size && state.teams.every((team) => team.length === 2 && team[0] !== team[1]);
}

function generateNextMatch() {
  clearMessage();
  if ((state.mode !== "6" && state.mode !== "R8") || !state.sessionStarted) return;

  if (!teamsAreValid()) {
    showMessage("Fix the team selections before generating a match.");
    return;
  }

  state.matchReady = true;
  renderMatchOnly();
}

function rotateFixedTeams(winnerTeamIndex) {
  const loserTeamIndex = state.currentTeams.find((teamIndex) => teamIndex !== winnerTeamIndex);
  state.currentTeams.forEach((teamIndex) => {
    state.fixedStreaks[teamIndex] = (state.fixedStreaks[teamIndex] || 0) + 1;
  });

  const forcedSitter = state.currentTeams.find((teamIndex) => state.fixedStreaks[teamIndex] >= 2);
  const sitter = forcedSitter ?? loserTeamIndex;
  const stayer = state.currentTeams.find((teamIndex) => teamIndex !== sitter);
  const nextTeam = state.waitingTeams.shift();

  state.waitingTeams.push(sitter);
  state.fixedStreaks[sitter] = 0;
  state.fixedStreaks[nextTeam] = state.fixedStreaks[nextTeam] || 0;
  state.currentTeams = [stayer, nextTeam];
  state.waitingTeam = state.waitingTeams[0];

  state.streakTeam = stayer;
  state.streak = state.fixedStreaks[stayer] || 0;
}

function calculateStandings() {
  if (!state.sessionStarted) {
    showMessage("Finish setup before calculating results.");
    return;
  }

  const stats = new Map();
  const keyFor = (team) => (isAmericanoMode() ? null : team.join("-"));

  if (isPadelScoreMode()) {
    const rows = padelResultRows();
    state.finalizedResult = { type: "padel", rows };
    renderPadelRows(rows);
    saveSession();
    return;
  }

  if (isAmericanoMode()) {
    state.players.forEach((name, index) => {
      stats.set(String(index), { name, played: 0, wins: 0, points: 0, against: 0 });
    });
  } else {
    state.teams.forEach((team) => {
      stats.set(keyFor(team), { name: teamName(team), played: 0, wins: 0, points: 0, against: 0 });
    });
  }

  state.matches.forEach((match) => {
    if (isAmericanoMode()) {
      applyPlayerStats(stats, match.teamA, match.scoreA, match.scoreB, match.winner === "A");
      applyPlayerStats(stats, match.teamB, match.scoreB, match.scoreA, match.winner === "B");
      return;
    }

    applyTeamStats(stats.get(keyFor(match.teamA)), match.scoreA, match.scoreB, match.winner === "A");
    applyTeamStats(stats.get(keyFor(match.teamB)), match.scoreB, match.scoreA, match.winner === "B");
  });

  const rows = [...stats.values()].sort((a, b) =>
    b.points - a.points || b.wins - a.wins || (b.points - b.against) - (a.points - a.against)
  );

  state.finalizedResult = { type: "standings", rows };
  renderStandings(rows);
  saveSession();
}

function applyPlayerStats(stats, team, points, against, won) {
  team.forEach((playerIndex) => applyTeamStats(stats.get(String(playerIndex)), points, against, won));
}

function applyTeamStats(row, points, against, won) {
  row.played += 1;
  row.wins += won ? 1 : 0;
  row.points += points;
  row.against += against;
}

function render() {
  if (!state.mode) {
    els.entryScreen.hidden = false;
    els.workspace.hidden = true;
    renderEntryScreen();
    saveSession();
    return;
  }

  els.entryScreen.hidden = true;
  els.workspace.hidden = false;
  els.setupPanel.hidden = state.sessionStarted;
  els.modeTitle.textContent = modeConfig[state.mode].title;
  els.modeNote.textContent = modeConfig[state.mode].note;
  els.calculateBtn.disabled = !state.sessionStarted;
  renderSetupWizard();
  renderMatchOnly();
  renderLog();
  renderSchedule();
  els.standings.className = "standings empty-state";
  els.standings.textContent = "Add scores, then finalize.";
  renderFinalizedResult();
  clearMessage();
  updateScoreFeedback();
  saveSession();
}

function renderSetupWizard() {
  const steps = isAmericanoMode()
    ? ["Names", "Start"]
    : ["Names", "Pairs", "Start"];
  const activeStep = state.setupStep;
  els.setupSteps.innerHTML = steps.map((label, index) => `
    <span class="setup-step ${index + 1 === activeStep ? "active" : ""} ${index + 1 < activeStep || state.sessionStarted ? "done" : ""}">
      ${index + 1}. ${label}
    </span>
  `).join("");

  if (state.sessionStarted) {
    els.setupSubtitle.textContent = "Session is ready. You can still edit setup.";
    els.setupContent.innerHTML = renderSessionSummary();
    return;
  }

  if (state.setupStep === 1) {
    els.setupSubtitle.textContent = `Add ${modeConfig[state.mode].count} player names.`;
    els.setupContent.innerHTML = `
      <div class="players-form">
        ${state.players.map((name, index) => `
          <label>
            <span>Player ${index + 1}</span>
            <input data-player="${index}" value="${escapeHtml(name)}">
          </label>
        `).join("")}
      </div>
      <div class="wizard-actions">
        <button class="ghost-button" data-change-count type="button">Change count</button>
        <button class="secondary-button compact" data-setup-next type="button">${isAmericanoMode() ? "Start Americano" : "Next: pairs"}</button>
      </div>
    `;
    return;
  }

  els.setupSubtitle.textContent = "Create the pairs before scoring starts.";
  els.setupContent.innerHTML = `
    <div class="team-setup">
      ${state.teams.map((team, teamIndex) => `
        <div class="team-picker">
          <h3>Team ${teamIndex + 1}</h3>
          <label>
            <span>First player</span>
            <select data-team="${teamIndex}" data-slot="0">${playerOptions(team[0])}</select>
          </label>
          <label>
            <span>Second player</span>
            <select data-team="${teamIndex}" data-slot="1">${playerOptions(team[1])}</select>
          </label>
        </div>
      `).join("")}
    </div>
    <div class="wizard-actions">
      <button class="ghost-button" data-setup-back type="button">Back</button>
      <button class="secondary-button compact" data-start-session type="button">Start scoring</button>
    </div>
  `;
}

function renderSessionSummary() {
  const pairs = isAmericanoMode()
    ? `<div class="summary-card"><strong>Americano</strong><span>Pairs are generated round by round.</span></div>`
    : state.teams.map((team, index) => `
      <div class="summary-card">
        <strong>Team ${index + 1}</strong>
        <span>${escapeHtml(teamName(team))}</span>
      </div>
    `).join("");

  return `
    <div class="summary-list">
      <div class="summary-card accent">
        <strong>${modeConfig[state.mode].count} players</strong>
        <span>${escapeHtml(modeConfig[state.mode].title)}</span>
      </div>
      ${pairs}
    </div>
    <div class="wizard-actions">
      <button class="ghost-button" data-edit-setup type="button">Edit setup</button>
      <button class="secondary-button compact" data-new-session type="button">New session</button>
    </div>
  `;
}

function playerOptions(selectedIndex) {
  return state.players
    .map((name, index) => `<option value="${index}" ${index === selectedIndex ? "selected" : ""}>${escapeHtml(name.trim() || `Player ${index + 1}`)}</option>`)
    .join("");
}

function renderMatchOnly() {
  if (!state.sessionStarted) {
    els.currentMatch.innerHTML = `<div class="empty-state">Finish the setup steps to create the first match.</div>`;
    els.scoreForm.hidden = true;
    els.padelPanel.hidden = true;
    els.parallelPanel.hidden = true;
    renderGenerateButton();
    renderSchedule();
    updateScoreFeedback();
    return;
  }

  const match = activeMatch();
  if (!match) {
    els.currentMatch.innerHTML = `<div class="empty-state">All Americano rounds are complete.</div>`;
    els.parallelPanel.hidden = true;
    els.padelPanel.hidden = true;
    els.scoreForm.hidden = true;
    if (state.mode === "6" || state.mode === "R8") {
      els.scoreForm.querySelectorAll("input, button").forEach((control) => control.disabled = true);
    }
    renderGenerateButton();
    updateScoreFeedback();
    return;
  }

  els.scoreForm.hidden = false;
  els.padelPanel.hidden = !isPadelScoreMode();
  els.parallelPanel.hidden = true;
  els.scoreForm.hidden = isPadelScoreMode();
  els.scoreForm.querySelectorAll("input, button").forEach((control) => control.disabled = false);
  els.scoreA.max = isPadelScoreMode() ? 99 : 21;
  els.scoreB.max = isPadelScoreMode() ? 99 : 21;
  els.teamALabel.textContent = `${teamName(match.teamA)} points`;
  els.teamBLabel.textContent = `${teamName(match.teamB)} points`;
  els.currentMatch.innerHTML = `
    <div class="court-match-row">
      <span>${escapeHtml(match.label)}</span>
      <strong class="pair-name">${teamNameHtml(match.teamA)}</strong>
      <b>vs</b>
      <strong class="pair-name">${teamNameHtml(match.teamB)}</strong>
    </div>
    ${state.mode === "6" ? `<div class="court-waiting">Waiting: ${escapeHtml(teamName(state.teams[state.waitingTeam]))}</div>` : ""}
    ${match.courtTwo ? `
      <div class="court-match-row">
        <span>Court 2</span>
        <strong class="pair-name">${teamNameHtml(match.courtTwo.teamA)}</strong>
        <b>vs</b>
        <strong class="pair-name">${teamNameHtml(match.courtTwo.teamB)}</strong>
      </div>
    ` : ""}
  `;
  if (match.courtTwo && !isPadelScoreMode()) {
    els.scoreForm.hidden = true;
    els.currentMatch.innerHTML = "";
    renderParallelPanel();
  }
  if (!match.courtTwo && !isPadelScoreMode()) {
    els.scoreForm.hidden = true;
    els.currentMatch.innerHTML = "";
    renderSingleCourtScorePanel(match);
  }
  if (isPadelScoreMode()) {
    els.currentMatch.innerHTML = "";
  }
  renderGenerateButton();
  renderSchedule();
  renderPadelPanel();
  updateScoreFeedback();
}

function renderSingleCourtScorePanel(match) {
  const waitingPairs = state.mode === "6"
    ? state.waitingTeams.map((teamIndex) => state.teams[teamIndex])
    : match.waiting || [];

  els.parallelPanel.hidden = false;
  els.parallelPanel.innerHTML = `
    <div class="court-score-row">
      <span class="court-title">Court 1</span>
      <div class="pair-score">
        <strong class="pair-name">${teamNameHtml(match.teamA)}</strong>
        <input id="singleScoreA" data-single-score="A" data-single-target="singleScoreB" type="number" min="0" max="21" placeholder="0" inputmode="numeric">
      </div>
      <div class="pair-score pair-score-right">
        <strong class="pair-name">${teamNameHtml(match.teamB)}</strong>
        <input id="singleScoreB" data-single-score="B" data-single-target="singleScoreA" type="number" min="0" max="21" placeholder="0" inputmode="numeric">
      </div>
    </div>
    ${waitingPairs.length ? `
      <div class="waiting-row">
        <span>Waiting</span>
        ${waitingPairs.map((team, index) => `
          <div class="pair-score ${index % 2 === 1 ? "pair-score-right" : ""}">
            <strong class="pair-name">${teamNameHtml(team)}</strong>
            <input type="number" placeholder="0" disabled>
          </div>
        `).join("")}
      </div>
    ` : ""}
    <div class="score-form">
      <button class="secondary-button" data-add-single type="button">Add match</button>
    </div>
  `;
}

function renderParallelPanel() {
  const match = activeMatch();
  els.parallelPanel.hidden = false;
  els.parallelPanel.innerHTML = `
    <div class="court-score-row">
      <span class="court-title">Court 1</span>
      <div class="pair-score">
        <strong class="pair-name">${teamNameHtml(match.teamA)}</strong>
        <input id="court1A" data-parallel-score="court1A" data-pair-target="court1B" type="number" min="0" max="21" placeholder="0" inputmode="numeric">
      </div>
      <div class="pair-score pair-score-right">
        <strong class="pair-name">${teamNameHtml(match.teamB)}</strong>
        <input id="court1B" data-parallel-score="court1B" data-pair-target="court1A" type="number" min="0" max="21" placeholder="0" inputmode="numeric">
      </div>
    </div>
    <div class="court-score-row">
      <span class="court-title">Court 2</span>
      <div class="pair-score">
        <strong class="pair-name">${teamNameHtml(match.courtTwo.teamA)}</strong>
        <input id="court2A" data-parallel-score="court2A" data-pair-target="court2B" type="number" min="0" max="21" placeholder="0" inputmode="numeric">
      </div>
      <div class="pair-score pair-score-right">
        <strong class="pair-name">${teamNameHtml(match.courtTwo.teamB)}</strong>
        <input id="court2B" data-parallel-score="court2B" data-pair-target="court2A" type="number" min="0" max="21" placeholder="0" inputmode="numeric">
      </div>
    </div>
    <div class="score-form">
      <button class="secondary-button" data-add-parallel type="button">Add matches</button>
    </div>
  `;
}

function renderGenerateButton() {
  if (!els.generateMatchBtn) return;
  els.generateMatchBtn.hidden = true;
  els.generateMatchBtn.disabled = true;
}

function renderSchedule() {
  if (!state.sessionStarted) {
    els.schedulePanel.innerHTML = "";
    return;
  }

  if (!isAmericanoMode()) {
    els.schedulePanel.innerHTML = "";
    return;
  }

  els.schedulePanel.innerHTML = `
    <h3>Americano schedule</h3>
    ${state.americanoRounds.map((round, index) => `
      <div class="round">
        <strong>${index + 1 === state.roundIndex + 1 ? "Now" : round.label}</strong>
        <span>${escapeHtml(teamName(round.teamA))} vs ${escapeHtml(teamName(round.teamB))}</span>
      </div>
    `).join("")}
  `;
}

function renderStandings(rows) {
  els.standings.className = "standings";
  els.standings.innerHTML = rows.map((row, index) => `
    <div class="standing-row">
      ${rankBadgeHtml(rankForRow(rows, row, index))}
      <div class="standing-main">
        <strong>${escapeHtml(row.name)}</strong>
        <div class="statline">${row.played} played · ${row.wins} wins · diff ${row.points - row.against}</div>
      </div>
      <div class="points">${row.points}</div>
    </div>
  `).join("");
}

function renderFinalizedResult() {
  if (!state.finalizedResult) return;
  if (state.finalizedResult.type === "padel") {
    renderPadelRows(state.finalizedResult.rows);
    return;
  }
  renderStandings(state.finalizedResult.rows);
}

function rankForRow(rows, row, index) {
  let rank = 1;
  for (let rowIndex = 1; rowIndex <= index; rowIndex += 1) {
    if (!standingsRowsAreTied(rows[rowIndex - 1], rows[rowIndex])) rank += 1;
  }
  return rank;
}

function standingsRowsAreTied(a, b) {
  return a.points === b.points
    && a.wins === b.wins
    && (a.points - a.against) === (b.points - b.against);
}

function rankBadgeHtml(rank) {
  const medals = [
    { label: "1st place", className: "gold", symbol: "1" },
    { label: "2nd place", className: "silver", symbol: "2" },
    { label: "3rd place", className: "bronze", symbol: "3" },
  ];
  const medal = medals[rank - 1];
  if (!medal) return `<div class="rank">${rank}</div>`;
  return `<div class="rank medal ${medal.className}" title="${medal.label}" aria-label="${medal.label}">${medal.symbol}</div>`;
}

function renderPadelPanel() {
  if (!isPadelScoreMode() || !state.sessionStarted) {
    els.padelPanel.hidden = true;
    return;
  }

  if (state.mode === "P8") {
    renderTwoCourtPadelPanel();
    return;
  }

  els.padelPanel.hidden = false;
  const match = activeMatch();
  els.padelPanel.innerHTML = `
    <div class="court-score-row">
      <span class="court-title">Court 1</span>
      <div class="pair-score">
        <strong class="pair-name">${teamNameHtml(match.teamA)}</strong>
        <input id="padelSetA" type="number" min="0" max="7" placeholder="0" inputmode="numeric">
      </div>
      <div class="pair-score pair-score-right">
        <strong class="pair-name">${teamNameHtml(match.teamB)}</strong>
        <input id="padelSetB" type="number" min="0" max="7" placeholder="0" inputmode="numeric">
      </div>
    </div>
    <div class="score-form">
      <button class="secondary-button" data-padel-add-set type="button">Add set</button>
    </div>
    <div class="sets-line">${state.padel.sets.length ? `Sets: ${state.padel.sets.map((set) => set.join("-")).join(", ")}` : "Sets: -"}</div>
  `;
}

function renderTwoCourtPadelPanel() {
  const match = activeMatch();
  els.padelPanel.hidden = false;
  els.padelPanel.innerHTML = `
    <div class="court-score-row">
      <span class="court-title">Court 1</span>
      <div class="pair-score">
        <strong class="pair-name">${teamNameHtml(match.teamA)}</strong>
        <input id="court1A" type="number" min="0" max="7" placeholder="0" inputmode="numeric">
      </div>
      <div class="pair-score pair-score-right">
        <strong class="pair-name">${teamNameHtml(match.teamB)}</strong>
        <input id="court1B" type="number" min="0" max="7" placeholder="0" inputmode="numeric">
      </div>
    </div>
    <div class="court-score-row">
      <span class="court-title">Court 2</span>
      <div class="pair-score">
        <strong class="pair-name">${teamNameHtml(match.courtTwo.teamA)}</strong>
        <input id="court2A" type="number" min="0" max="7" placeholder="0" inputmode="numeric">
      </div>
      <div class="pair-score pair-score-right">
        <strong class="pair-name">${teamNameHtml(match.courtTwo.teamB)}</strong>
        <input id="court2B" type="number" min="0" max="7" placeholder="0" inputmode="numeric">
      </div>
    </div>
    <div class="score-form">
      <button class="secondary-button" data-padel-two-courts type="button">Add sets</button>
    </div>
  `;
}

function addTwoCourtPadelSets() {
  const values = ["court1A", "court1B", "court2A", "court2B"].map((id) => Number(document.querySelector(`#${id}`).value));

  const match = activeMatch();
  const setOne = [values[0], values[1]];
  const setTwo = [values[2], values[3]];
  if (!match || !padelSetScoresAreValid(setOne[0], setOne[1]) || !padelSetScoresAreValid(setTwo[0], setTwo[1])) return;

  clearFinalizedResult();
  state.padel.sets.push(setOne, setTwo);
  state.matches.push({
    mode: "P8",
    label: "Court 1",
    teamA: [...match.teamA],
    teamB: [...match.teamB],
    scoreA: setOne[0],
    scoreB: setOne[1],
    winner: setOne[0] > setOne[1] ? "A" : "B",
  });
  state.matches.push({
    mode: "P8",
    label: "Court 2",
    teamA: [...match.courtTwo.teamA],
    teamB: [...match.courtTwo.teamB],
    scoreA: setTwo[0],
    scoreB: setTwo[1],
    winner: setTwo[0] > setTwo[1] ? "A" : "B",
  });
  render();
}

function padelPointLabels() {
  const [a, b] = state.padel.points;
  if (a >= 3 && b >= 3) {
    if (a === b) return ["40", "40"];
    return a > b ? ["Ad", "40"] : ["40", "Ad"];
  }

  const labels = ["0", "15", "30", "40"];
  return [labels[a], labels[b]];
}

function padelResultRows() {
  return state.teams.map((team, index) => {
    const wonSets = state.padel.sets.filter((set) => set[index] > set[index === 0 ? 1 : 0]).length;
    return {
      name: teamName(team),
      played: state.padel.sets.length,
      wins: wonSets,
      points: wonSets,
      against: 0,
      setLine: state.padel.sets.map((set) => `${set[index]}-${set[index === 0 ? 1 : 0]}`).join(", ") || "-",
    };
  }).sort((a, b) => b.wins - a.wins);
}

function renderPadelRows(rows) {
  els.standings.className = "standings";
  els.standings.innerHTML = rows.map((row, index) => `
    <div class="standing-row">
      ${rankBadgeHtml(padelRankForRow(rows, row, index))}
      <div class="standing-main">
        <strong>${escapeHtml(row.name)}</strong>
        <div class="statline">${row.wins} sets · ${escapeHtml(row.setLine)}</div>
      </div>
      <div class="points">${row.wins}</div>
    </div>
  `).join("");
}

function padelRankForRow(rows, row, index) {
  let rank = 1;
  for (let rowIndex = 1; rowIndex <= index; rowIndex += 1) {
    if (rows[rowIndex - 1].wins !== rows[rowIndex].wins) rank += 1;
  }
  return rank;
}

function isPadelScoreMode() {
  return state.mode === "4" || state.mode === "P8";
}

function renderLog() {
  els.matchCount.textContent = `${state.matches.length} ${state.matches.length === 1 ? "match" : "matches"}`;
  if (!state.matches.length) {
    els.matchLog.className = "match-log empty-state";
    els.matchLog.textContent = "No matches yet.";
    return;
  }

  els.matchLog.className = "match-log";
  els.matchLog.innerHTML = state.matches.slice().reverse().map((match, index) => {
    const matchIndex = state.matches.length - 1 - index;
    if (state.editingMatchIndex === matchIndex) {
      return `
        <div class="log-row editing">
          <b>#${matchIndex + 1}</b>
          <span>${escapeHtml(match.label)} · ${escapeHtml(teamName(match.teamA))} - ${escapeHtml(teamName(match.teamB))}</span>
          <div class="edit-score-row">
            <input data-edit-score-a="${matchIndex}" type="number" min="0" max="99" value="${match.scoreA}" inputmode="numeric">
            <span>-</span>
            <input data-edit-score-b="${matchIndex}" type="number" min="0" max="99" value="${match.scoreB}" inputmode="numeric">
            <button class="primary-button save-button" data-save-match="${matchIndex}" type="button">Save</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="log-row">
        <b>#${matchIndex + 1}</b>
        <span>${escapeHtml(match.label)} · ${escapeHtml(teamName(match.teamA))} ${match.scoreA} - ${match.scoreB} ${escapeHtml(teamName(match.teamB))}</span>
        <button class="ghost-button small-button" data-edit-match="${matchIndex}" type="button">Edit</button>
      </div>
    `;
  }).join("");
}

function startSession() {
  clearMessage();
  if (!playersAreValid()) {
    showMessage("Add a name for every player first.");
    return;
  }
  if (!teamsAreValid()) {
    showMessage("Each player can be used once across the selected pairs.");
    return;
  }

  state.sessionStarted = true;
  state.setupStep = isAmericanoMode() ? 2 : 3;
  state.matches = [];
  state.editingMatchIndex = null;
  state.currentTeams = [0, 1];
  state.waitingTeam = 2;
  state.waitingTeams = initialWaitingTeams(state.mode);
  state.fixedStreaks = {};
  state.rotationRound = 0;
  state.matchReady = true;
  state.streakTeam = null;
  state.streak = 0;
  resetPadelScore();
  state.roundIndex = 0;
  state.americanoRounds = isAmericanoMode() ? buildAmericanoRounds() : [];
  els.scoreA.value = "";
  els.scoreB.value = "";
  render();
}

function playersAreValid() {
  return state.players.every((name) => name.trim().length > 0);
}

function playerDisplayName(index) {
  return state.players[index]?.trim() || `Player ${index + 1}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(message) {
  els.formMessage.textContent = message;
}

function clearMessage() {
  els.formMessage.textContent = "";
}

function updateScoreFeedback() {
  const scoreA = Number(els.scoreA.value) || 0;
  const scoreB = Number(els.scoreB.value) || 0;
  const total = scoreA + scoreB;
  const needsTarget = state.mode === "6" || isAmericanoMode();

  els.scoreTotal.classList.remove("ready", "error");
  els.scoreTargetLabel.textContent = isPadelScoreMode() ? "Standard" : "Target 21";
  if (isPadelScoreMode()) {
    els.scoreTotal.textContent = `${state.padel.sets.length} sets`;
    return;
  }
  if (!needsTarget) {
    els.scoreTotal.textContent = `${total} points`;
    return;
  }

  els.scoreTotal.textContent = `${total} / 21 points`;
  if (total === 21 && scoreA !== scoreB) {
    els.scoreTotal.classList.add("ready");
  } else if (total > 21) {
    els.scoreTotal.classList.add("error");
  }
}

function changeScore(target, step) {
  const input = target === "A" ? els.scoreA : els.scoreB;
  const maxScore = isPadelScoreMode() ? 99 : 21;
  const next = Math.max(0, Math.min(maxScore, (Number(input.value) || 0) + step));
  input.value = next;
  autocompleteAmericanoScore(target);
  clearMessage();
  updateScoreFeedback();
}

function autocompleteAmericanoScore(changedTarget) {
  if (state.mode !== "6" && !isAmericanoMode()) return;
  const source = changedTarget === "A" ? els.scoreA : els.scoreB;
  const target = changedTarget === "A" ? els.scoreB : els.scoreA;
  const value = Number(source.value);
  if (!Number.isFinite(value)) return;
  target.value = Math.max(0, Math.min(21, 21 - value));
}

function renderEntryScreen() {
  els.entryFirstStep.hidden = state.entryStep !== 1;
  els.entryNamesStep.hidden = state.entryStep !== 2;
  document.querySelectorAll("[data-people]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.people) === state.entryPeople);
  });
  renderGameTypeOptions();
  els.gameTypeSelect.value = state.entryGameType;
  els.courtsField.hidden = state.entryPeople !== 8;
  els.courtsSelect.disabled = state.entryPeople === 8 && state.entryGameType === "standard";
  els.courtsSelect.value = String(state.entryCourts);

  if (state.entryStep === 2) {
    els.entryNames.innerHTML = entryUsesPairs()
      ? Array.from({ length: state.entryPeople / 2 }, (_, index) => `
        <div class="entry-pair">
          <input data-entry-pair="${index}" data-pair-slot="0" placeholder="Player ${index * 2 + 1}" autocomplete="off">
          <span>/</span>
          <input data-entry-pair="${index}" data-pair-slot="1" placeholder="Player ${index * 2 + 2}" autocomplete="off">
        </div>
      `).join("")
      : Array.from({ length: state.entryPeople }, (_, index) => `
        <input data-entry-name="${index}" placeholder="Player ${index + 1}" autocomplete="off">
      `).join("");
  }
}

function renderGameTypeOptions() {
  state.entryPeople = Number(state.entryPeople);
  if (![4, 6, 8].includes(state.entryPeople)) state.entryPeople = 6;
  const options = gameTypeOptions[state.entryPeople] || gameTypeOptions[6];
  if (!options.some((option) => option.value === state.entryGameType)) {
    state.entryGameType = options[0].value;
  }
  if (state.entryPeople === 8 && state.entryGameType === "standard") state.entryCourts = 2;
  els.gameTypeSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
}

function entryPlayerNames() {
  return [...els.entryNames.querySelectorAll("input")]
    .map((input, index) => input.value.trim() || `Player ${index + 1}`);
}

function entryUsesPairs() {
  return state.entryGameType === "standard" || state.entryGameType === "fixed";
}

function entryTeams() {
  if (!entryUsesPairs()) return [];
  const inputs = [...els.entryNames.querySelectorAll("input")];
  return [...els.entryNames.querySelectorAll(".entry-pair")].map((row) =>
    [...row.querySelectorAll("input")].map((input) => inputs.indexOf(input))
  );
}

function startFromEntry() {
  const names = entryPlayerNames();
  let mode = null;

  if (state.entryGameType === "standard" && state.entryPeople === 4) mode = "4";
  if (state.entryGameType === "standard" && state.entryPeople === 8) mode = "P8";
  if (state.entryGameType === "fixed" && state.entryPeople === 6) mode = "6";
  if (state.entryGameType === "fixed" && state.entryPeople === 8) mode = "R8";
  if (state.entryGameType === "americano" && state.entryPeople === 6) mode = "A6";
  if (state.entryGameType === "americano" && state.entryPeople === 8) mode = "8";

  if (!mode) {
    els.entryMessage.textContent = "This game type does not match the people count.";
    return;
  }

  state.mode = mode;
  state.players = names;
  state.teams = entryUsesPairs() ? entryTeams() : defaultTeams(mode);
  state.matches = [];
  state.currentTeams = [0, 1];
  state.waitingTeam = 2;
  state.waitingTeams = initialWaitingTeams(mode);
  state.fixedStreaks = {};
  state.matchReady = true;
  state.streakTeam = null;
  state.streak = 0;
  resetPadelScore();
  state.roundIndex = 0;
  state.americanoRounds = isAmericanoMode(mode) ? buildAmericanoRounds() : [];
  state.sessionStarted = false;
  state.setupStep = 1;
  els.entryMessage.textContent = "";
  startSession();
}

els.gameTypeSelect.addEventListener("change", () => {
  state.entryGameType = els.gameTypeSelect.value;
  if (state.entryPeople === 8 && state.entryGameType === "standard") state.entryCourts = 2;
  els.entryMessage.textContent = "";
  saveSession();
  renderEntryScreen();
});

els.courtsSelect.addEventListener("change", () => {
  state.entryCourts = Number(els.courtsSelect.value);
  els.entryMessage.textContent = "";
  saveSession();
});

els.entryFirstStep.addEventListener("click", (event) => {
  const peopleButton = event.target.closest("[data-people]");
  if (!peopleButton) return;
  state.entryPeople = Number(peopleButton.dataset.people);
  state.entryGameType = defaultGameTypeByPeople[state.entryPeople] || state.entryGameType;
  if (state.entryPeople !== 8) state.entryCourts = 1;
  if (state.entryPeople === 8) state.entryCourts = 2;
  renderGameTypeOptions();
  renderEntryScreen();
  els.entryMessage.textContent = "";
  saveSession();
});

els.entryNextBtn.addEventListener("click", () => {
  state.entryGameType = els.gameTypeSelect.value;
  state.entryCourts = state.entryPeople === 8 ? Number(els.courtsSelect.value) : 1;
  if (state.entryPeople === 8 && state.entryGameType === "standard") state.entryCourts = 2;
  state.entryStep = 2;
  els.entryMessage.textContent = "";
  renderEntryScreen();
  saveSession();
});

els.entryBackBtn.addEventListener("click", () => {
  state.entryStep = 1;
  els.entryMessage.textContent = "";
  renderEntryScreen();
  saveSession();
});

els.entryStartBtn.addEventListener("click", startFromEntry);

els.setupContent.addEventListener("click", (event) => {
  if (event.target.closest("[data-setup-back]")) {
    state.setupStep = Math.max(1, state.setupStep - 1);
    render();
    return;
  }

  if (event.target.closest("[data-setup-next]")) {
    if (!playersAreValid()) {
      showMessage("Add a name for every player first.");
      return;
    }
    if (isAmericanoMode()) startSession();
    else {
      state.setupStep = 2;
      render();
    }
    return;
  }

  if (event.target.closest("[data-start-session]")) {
    startSession();
    return;
  }

  if (event.target.closest("[data-edit-setup]")) {
    state.sessionStarted = false;
    state.setupStep = isAmericanoMode() ? 1 : 2;
    render();
    return;
  }

  if (event.target.closest("[data-new-session]")) {
    resetToEntry();
    return;
  }

  if (event.target.closest("[data-change-count]")) {
    resetToEntry();
  }
});

els.setupContent.addEventListener("input", (event) => {
  if (event.target.matches("[data-player]")) updatePlayer(Number(event.target.dataset.player), event.target.value);
});

els.setupContent.addEventListener("change", (event) => {
  if (event.target.matches("[data-team]")) {
    updateTeam(Number(event.target.dataset.team), Number(event.target.dataset.slot), event.target.value);
  }
});

els.scoreForm.addEventListener("submit", addMatch);
els.scoreForm.addEventListener("input", (event) => {
  if (event.target === els.scoreA) autocompleteAmericanoScore("A");
  if (event.target === els.scoreB) autocompleteAmericanoScore("B");
  updateScoreFeedback();
});
els.scoreForm.addEventListener("click", (event) => {
  const button = event.target.closest("[data-score-target]");
  if (!button) return;
  changeScore(button.dataset.scoreTarget, Number(button.dataset.step));
});
els.padelPanel.addEventListener("click", (event) => {
  const pointButton = event.target.closest("[data-padel-point]");
  if (pointButton) {
    addPadelPoint(Number(pointButton.dataset.padelPoint));
    return;
  }

  if (event.target.closest("[data-padel-two-courts]")) {
    addTwoCourtPadelSets();
    return;
  }

  if (event.target.closest("[data-padel-add-set]")) {
    addSingleCourtPadelSet();
    return;
  }

  if (event.target.closest("[data-padel-reset]")) {
    undoPadelPoint();
  }
});
els.parallelPanel.addEventListener("input", (event) => {
  const input = event.target.closest("[data-parallel-score], [data-single-score]");
  if (!input) return;
  const paired = document.querySelector(`#${input.dataset.pairTarget || input.dataset.singleTarget}`);
  const value = Number(input.value);
  if (paired && Number.isFinite(value)) paired.value = Math.max(0, Math.min(21, 21 - value));
});
els.parallelPanel.addEventListener("click", (event) => {
  if (event.target.closest("[data-add-parallel]")) addParallelMatches();
  if (event.target.closest("[data-add-single]")) addSingleCourtMatch();
});
els.matchLog.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-match]");
  if (editButton) {
    editMatch(Number(editButton.dataset.editMatch));
    return;
  }

  const saveButton = event.target.closest("[data-save-match]");
  if (saveButton) {
    saveEditedMatch(Number(saveButton.dataset.saveMatch));
  }
});
els.matchLog.addEventListener("input", (event) => {
  const inputA = event.target.closest("[data-edit-score-a]");
  const inputB = event.target.closest("[data-edit-score-b]");
  if (!inputA && !inputB) return;

  const matchIndex = Number(inputA?.dataset.editScoreA ?? inputB?.dataset.editScoreB);
  const match = state.matches[matchIndex];
  if (!match || !matchNeedsTwentyOne(match)) return;

  const source = inputA || inputB;
  const target = inputA
    ? document.querySelector(`[data-edit-score-b="${matchIndex}"]`)
    : document.querySelector(`[data-edit-score-a="${matchIndex}"]`);
  const value = Number(source.value);
  if (target && Number.isFinite(value)) target.value = Math.max(0, Math.min(21, 21 - value));
});
els.calculateBtn.addEventListener("click", calculateStandings);
els.resetBtn.addEventListener("click", openResetDialog);
els.clearSessionBtn.addEventListener("click", openResetDialog);
els.confirmResetBtn.addEventListener("click", confirmResetSession);
els.cancelResetBtn.addEventListener("click", closeResetDialog);
els.resetDialog.addEventListener("click", (event) => {
  if (event.target === els.resetDialog) closeResetDialog();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.resetDialog.hidden) closeResetDialog();
});
els.generateMatchBtn?.addEventListener("click", generateNextMatch);

if (restoreSavedSession()) {
  render();
} else {
  resetToEntry();
}
