import { teams, venues } from "../data/teams";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const oversToDecimal = (oversText) => {
  const [overs, balls = "0"] = String(oversText).split(".");
  return Number(overs) + Number(balls) / 6;
};

const runRate = (runs, oversText) => runs / oversToDecimal(oversText);

const weighted = (previousSeason, currentSeason) =>
  previousSeason * 0.42 + currentSeason * 0.58;

const SCORE_WEIGHTS = {
  batting: 0.3,
  bowling: 0.3,
  recentForm: 0.2,
  venue: 0.1,
  tossPitch: 0.1,
};

const conditionProfiles = {
  csk: { chasing: 64, spin: 88, pace: 62, highScoring: 63 },
  mi: { chasing: 84, spin: 58, pace: 82, highScoring: 78 },
  rcb: { chasing: 83, spin: 66, pace: 72, highScoring: 86 },
  kkr: { chasing: 70, spin: 87, pace: 70, highScoring: 70 },
  rr: { chasing: 76, spin: 82, pace: 74, highScoring: 74 },
  srh: { chasing: 78, spin: 65, pace: 75, highScoring: 92 },
  dc: { chasing: 73, spin: 76, pace: 68, highScoring: 72 },
  pbks: { chasing: 85, spin: 70, pace: 78, highScoring: 82 },
  lsg: { chasing: 66, spin: 84, pace: 70, highScoring: 65 },
  gt: { chasing: 78, spin: 73, pace: 78, highScoring: 70 },
};

// Key player form snapshot from IPL 2026 run-scorer and wicket-taker reports
// viewed on 2026-04-23. Scores are simple 0-100 impact ratings.
const keyPlayerData = {
  csk: {
    batters: [
      { name: "Sanju Samson", impact: 86 },
      { name: "Shivam Dube", impact: 72 },
    ],
    bowlers: [
      { name: "Anshul Kamboj", impact: 94, style: "pace" },
      { name: "Jamie Overton", impact: 76, style: "pace" },
    ],
  },
  mi: {
    batters: [
      { name: "Quinton de Kock", impact: 90 },
      { name: "Tilak Varma", impact: 84 },
    ],
    bowlers: [
      { name: "Jasprit Bumrah", impact: 72, style: "pace" },
      { name: "Deepak Chahar", impact: 66, style: "pace" },
    ],
  },
  rcb: {
    batters: [
      { name: "Virat Kohli", impact: 88 },
      { name: "Rajat Patidar", impact: 84 },
    ],
    bowlers: [
      { name: "Bhuvneshwar Kumar", impact: 86, style: "pace" },
      { name: "Krunal Pandya", impact: 78, style: "spin" },
    ],
  },
  kkr: {
    batters: [
      { name: "Angkrish Raghuvanshi", impact: 78 },
      { name: "Ajinkya Rahane", impact: 70 },
    ],
    bowlers: [
      { name: "Kartik Tyagi", impact: 78, style: "pace" },
      { name: "Vaibhav Arora", impact: 70, style: "pace" },
    ],
  },
  rr: {
    batters: [
      { name: "Vaibhav Sooryavanshi", impact: 91 },
      { name: "Dhruv Jurel", impact: 76 },
    ],
    bowlers: [
      { name: "Jofra Archer", impact: 90, style: "pace" },
      { name: "Ravi Bishnoi", impact: 90, style: "spin" },
    ],
  },
  srh: {
    batters: [
      { name: "Abhishek Sharma", impact: 96 },
      { name: "Heinrich Klaasen", impact: 95 },
    ],
    bowlers: [
      { name: "Eshan Malinga", impact: 92, style: "pace" },
      { name: "Harsh Dubey", impact: 80, style: "spin" },
    ],
  },
  dc: {
    batters: [
      { name: "Tristan Stubbs", impact: 78 },
      { name: "Sameer Rizvi", impact: 76 },
    ],
    bowlers: [
      { name: "Lungi Ngidi", impact: 78, style: "pace" },
      { name: "Axar Patel", impact: 70, style: "spin" },
    ],
  },
  pbks: {
    batters: [
      { name: "Shreyas Iyer", impact: 86 },
      { name: "Priyansh Arya", impact: 90 },
    ],
    bowlers: [
      { name: "Arshdeep Singh", impact: 80, style: "pace" },
      { name: "Vijaykumar Vyshak", impact: 72, style: "pace" },
    ],
  },
  lsg: {
    batters: [
      { name: "Rishabh Pant", impact: 75 },
      { name: "Aiden Markram", impact: 70 },
    ],
    bowlers: [
      { name: "Prince Yadav", impact: 94, style: "pace" },
      { name: "Mohammed Shami", impact: 78, style: "pace" },
    ],
  },
  gt: {
    batters: [
      { name: "Shubman Gill", impact: 90 },
      { name: "Jos Buttler", impact: 78 },
    ],
    bowlers: [
      { name: "Prasidh Krishna", impact: 92, style: "pace" },
      { name: "Kagiso Rabada", impact: 86, style: "pace" },
    ],
  },
};

const PLAYER_IMPACT_WEIGHT = 0.08;

const normalize = (value, min, max, invert = false) => {
  if (max === min) {
    return 72;
  }

  const ratio = (value - min) / (max - min);
  const adjusted = invert ? 1 - ratio : ratio;
  return 45 + adjusted * 55;
};

const rawProfiles = teams.map((team) => {
  const season2025 = team.stats[2025];
  const season2026 = team.stats[2026];

  const battingRate2025 = runRate(season2025.runsFor, season2025.oversFor);
  const battingRate2026 = runRate(season2026.runsFor, season2026.oversFor);
  const economy2025 = runRate(season2025.runsAgainst, season2025.oversAgainst);
  const economy2026 = runRate(season2026.runsAgainst, season2026.oversAgainst);

  const pointsPerMatch2026 = season2026.points / season2026.matches;
  const winRate2026 = season2026.wins / season2026.matches;

  return {
    id: team.id,
    battingRaw: weighted(battingRate2025, battingRate2026),
    bowlingRaw: weighted(economy2025, economy2026),
    formRaw: pointsPerMatch2026 + winRate2026 + season2026.nrr * 0.18,
  };
});

const rangeFor = (key) => {
  const values = rawProfiles.map((profile) => profile[key]);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

const ranges = {
  battingRaw: rangeFor("battingRaw"),
  bowlingRaw: rangeFor("bowlingRaw"),
  formRaw: rangeFor("formRaw"),
};

export const teamRatings = rawProfiles.reduce((ratings, profile) => {
  ratings[profile.id] = {
    batting: normalize(profile.battingRaw, ranges.battingRaw.min, ranges.battingRaw.max),
    bowling: normalize(
      profile.bowlingRaw,
      ranges.bowlingRaw.min,
      ranges.bowlingRaw.max,
      true
    ),
    recentForm: normalize(profile.formRaw, ranges.formRaw.min, ranges.formRaw.max),
  };

  return ratings;
}, {});

function getConditionProfile(team) {
  return (
    conditionProfiles[team.id] ?? {
      chasing: 70,
      spin: 70,
      pace: 70,
      highScoring: 70,
    }
  );
}

function averageImpact(players) {
  return players.reduce((total, player) => total + player.impact, 0) / players.length;
}

function getKeyPlayers(team) {
  return (
    keyPlayerData[team.id] ?? {
      batters: [{ name: "Top batter", impact: 70 }],
      bowlers: [{ name: "Top bowler", impact: 70, style: "pace" }],
    }
  );
}

function getStyleImpact(players, style) {
  const matchingPlayers = players.filter((player) => player.style === style);

  if (matchingPlayers.length === 0) {
    return 70;
  }

  return averageImpact(matchingPlayers);
}

export function getPitchSuggestion(venueName, timing) {
  const venue = venues.find((item) => item.name === venueName);

  if (!venue || !timing) {
    return null;
  }

  const pitchType =
    timing === "Night Match (Dew Advantage)" ? venue.nightPitch : venue.dayPitch;
  const dewLine =
    timing === "Night Match (Dew Advantage)"
      ? "Dew is likely to improve the chase."
      : "Day conditions reduce the dew swing.";

  return {
    pitchType,
    explanation: `${venue.note} ${dewLine}`,
  };
}

function getVenueScore(team, venueName) {
  const venue = venues.find((item) => item.name === venueName);

  if (venue?.homeTeamId === team.id) {
    return 100;
  }

  return 50;
}

function getPitchScore(team, conditions) {
  const { pitchType, venue: venueName, timing } = conditions;
  const rating = teamRatings[team.id];
  const profile = getConditionProfile(team);
  const venue = venues.find((item) => item.name === venueName);
  let score = 50;

  if (pitchType === "Batting Friendly") {
    score += (rating.batting - 70) * 0.45;
    score += (profile.highScoring - 70) * 0.55;
  }

  if (pitchType === "Bowling Friendly") {
    score += (rating.bowling - 70) * 0.45;
    score += (Math.max(profile.spin, profile.pace) - 70) * 0.35;
  }

  if (pitchType === "Balanced") {
    score += ((rating.batting + rating.bowling) / 2 - 70) * 0.35;
    score += ((profile.chasing + profile.highScoring) / 2 - 70) * 0.2;
  }

  if (pitchType === "Spin Friendly") {
    score += (rating.bowling - 70) * 0.35;
    score += (profile.spin - 70) * 0.75;
    if (team.homeVenue === "Chepauk" || team.homeVenue === "Lucknow") {
      score += 9;
    }
  }

  if (pitchType === "Pace Friendly") {
    score += (rating.bowling - 70) * 0.35;
    score += (profile.pace - 70) * 0.65;
    if (team.homeVenue === "Mohali" || team.homeVenue === "Wankhede") {
      score += 8;
    }
  }

  if (timing === "Night Match (Dew Advantage)" && pitchType === "Batting Friendly") {
    score += (profile.chasing - 70) * 0.25;
  }

  if (venue?.defaultPitch === pitchType && venue.homeTeamId === team.id) {
    score += 6;
  }

  return clamp(score, 25, 100);
}

function getTossScore(team, conditions) {
  const { toss, tossDecision, timing, pitchType } = conditions;
  const profile = getConditionProfile(team);
  let score = 50;

  if (toss === "Unknown" || tossDecision === "Unknown") {
    return score;
  }

  const tossWinner = toss === "teamA" ? conditions.teamA : conditions.teamB;
  const tossLoser = toss === "teamA" ? conditions.teamB : conditions.teamA;
  let battingSecondTeam = null;

  if (tossDecision === "Bowl First") {
    battingSecondTeam = tossWinner;
  }

  if (tossDecision === "Bat First") {
    battingSecondTeam = tossLoser;
  }

  if (timing === "Night Match (Dew Advantage)" && battingSecondTeam?.id === team.id) {
    score += 24;
    score += (profile.chasing - 70) * 0.45;
  }

  if (
    timing === "Day Match" &&
    tossWinner?.id === team.id &&
    tossDecision === "Bat First" &&
    (pitchType === "Spin Friendly" || pitchType === "Bowling Friendly")
  ) {
    score += 16;
  }

  if (
    tossWinner?.id === team.id &&
    tossDecision === "Bowl First" &&
    pitchType === "Pace Friendly"
  ) {
    score += 12;
  }

  if (timing === "Night Match (Dew Advantage)" && battingSecondTeam?.id !== team.id) {
    score -= 12;
  }

  if (
    tossWinner?.id === team.id &&
    tossDecision === "Bat First" &&
    pitchType === "Batting Friendly"
  ) {
    score += (profile.highScoring - 70) * 0.25;
  }

  if (
    tossWinner?.id !== team.id &&
    tossDecision === "Bat First" &&
    (pitchType === "Spin Friendly" || pitchType === "Bowling Friendly")
  ) {
    score -= 6;
  }

  return clamp(score, 25, 100);
}

function getTossPitchScore(team, conditions) {
  const pitchScore = getPitchScore(team, conditions);
  const tossScore = getTossScore(team, conditions);
  const tossKnown = conditions.toss !== "Unknown" && conditions.tossDecision !== "Unknown";

  return tossKnown ? pitchScore * 0.4 + tossScore * 0.6 : pitchScore * 0.7 + tossScore * 0.3;
}

function getKeyPlayerScore(team, conditions) {
  const players = getKeyPlayers(team);
  const battingImpact = averageImpact(players.batters);
  const bowlingImpact = averageImpact(players.bowlers);
  let score = battingImpact * 0.52 + bowlingImpact * 0.48;

  if (conditions.pitchType === "Batting Friendly") {
    score += (battingImpact - 70) * 0.22;
  }

  if (conditions.pitchType === "Spin Friendly") {
    score += (getStyleImpact(players.bowlers, "spin") - 70) * 0.28;
  }

  if (conditions.pitchType === "Pace Friendly") {
    score += (getStyleImpact(players.bowlers, "pace") - 70) * 0.22;
  }

  if (conditions.timing === "Night Match (Dew Advantage)") {
    score += (battingImpact - 70) * 0.12;
  }

  return clamp(score, 45, 98);
}

function getScoreBreakdown(team, conditions) {
  const rating = teamRatings[team.id];

  return {
    batting: rating.batting,
    bowling: rating.bowling,
    recentForm: rating.recentForm,
    venue: getVenueScore(team, conditions.venue),
    pitch: getPitchScore(team, conditions),
    toss: getTossScore(team, conditions),
    tossPitch: getTossPitchScore(team, conditions),
    keyPlayers: getKeyPlayerScore(team, conditions),
  };
}

function getWeightedScoreFromBreakdown(score) {
  const teamScore =
    score.batting * SCORE_WEIGHTS.batting +
    score.bowling * SCORE_WEIGHTS.bowling +
    score.recentForm * SCORE_WEIGHTS.recentForm +
    score.venue * SCORE_WEIGHTS.venue +
    score.tossPitch * SCORE_WEIGHTS.tossPitch;

  return teamScore * (1 - PLAYER_IMPACT_WEIGHT) + score.keyPlayers * PLAYER_IMPACT_WEIGHT;
}

function buildFactors(teamA, teamB, venueName, pitchType, conditions) {
  const ratingA = teamRatings[teamA.id];
  const ratingB = teamRatings[teamB.id];
  const profileA = getConditionProfile(teamA);
  const profileB = getConditionProfile(teamB);
  const keyPlayerScoreA = getKeyPlayerScore(teamA, conditions);
  const keyPlayerScoreB = getKeyPlayerScore(teamB, conditions);
  const factors = [];

  const addEdge = (label, aValue, bValue) => {
    const diff = aValue - bValue;

    if (Math.abs(diff) >= 3.5) {
      factors.push(`${label}: ${diff > 0 ? teamA.code : teamB.code}`);
    }
  };

  addEdge("Recent form edge", ratingA.recentForm, ratingB.recentForm);
  addEdge("Batting edge", ratingA.batting, ratingB.batting);
  addEdge("Bowling edge", ratingA.bowling, ratingB.bowling);
  addEdge("Key player edge", keyPlayerScoreA, keyPlayerScoreB);

  if (conditions.timing === "Night Match (Dew Advantage)") {
    addEdge("Chasing/dew edge", profileA.chasing, profileB.chasing);
  }

  if (pitchType === "Spin Friendly") {
    addEdge("Spin attack edge", profileA.spin, profileB.spin);
  }

  if (pitchType === "Batting Friendly") {
    addEdge("High-scoring edge", profileA.highScoring, profileB.highScoring);
  }

  if (teamA.homeVenue === venueName) {
    factors.push(`Venue edge: ${teamA.code}`);
  }

  if (teamB.homeVenue === venueName) {
    factors.push(`Venue edge: ${teamB.code}`);
  }

  if (conditions.timing === "Night Match (Dew Advantage)") {
    factors.push("Night dew increases chase value");
  }

  if (conditions.toss !== "Unknown" && conditions.tossDecision !== "Unknown") {
    factors.push(`Toss call: ${conditions.tossDecision}`);
  }

  factors.push(`Pitch focus: ${pitchType}`);

  return factors.slice(0, 5);
}

function getSimpleEdgeText(label, winnerValue, loserValue, winner, loser, closeText) {
  const diff = winnerValue - loserValue;

  if (Math.abs(diff) < 3) {
    return `${label}: ${closeText}`;
  }

  if (diff > 0) {
    return `${label}: ${winner.code} has the edge.`;
  }

  return `${label}: ${loser.code} has a small edge.`;
}

function getPitchText(winner, loser, conditions, winnerScore, loserScore) {
  const diff = winnerScore.pitch - loserScore.pitch;

  if (Math.abs(diff) < 3) {
    return `Pitch: ${conditions.pitchType} conditions look even.`;
  }

  const edgeTeam = diff > 0 ? winner : loser;
  const edgeCode = edgeTeam.code;

  if (conditions.pitchType === "Spin Friendly") {
    return `Pitch: ${edgeCode} is helped by stronger spin bowling.`;
  }

  if (conditions.pitchType === "Batting Friendly") {
    return `Pitch: ${edgeCode} gains from better high-scoring batting.`;
  }

  if (conditions.pitchType === "Pace Friendly") {
    return `Pitch: ${edgeCode} is helped by pace-friendly conditions.`;
  }

  return `Pitch: ${edgeCode} fits the conditions slightly better.`;
}

function getTossText(winner, loser, conditions, winnerScore, loserScore) {
  if (conditions.toss === "Unknown" || conditions.tossDecision === "Unknown") {
    return "Toss: Unknown, so no strong toss advantage is added.";
  }

  const diff = winnerScore.toss - loserScore.toss;
  const edgeTeam = diff >= 0 ? winner : loser;

  if (Math.abs(diff) < 3) {
    return "Toss: Toss impact is close.";
  }

  if (conditions.timing === "Night Match (Dew Advantage)") {
    return `Toss: ${edgeTeam.code} benefits from the dew/chasing setup.`;
  }

  if (
    conditions.tossDecision === "Bat First" &&
    (conditions.pitchType === "Spin Friendly" || conditions.pitchType === "Bowling Friendly")
  ) {
    return `Toss: ${edgeTeam.code} benefits because batting first can matter on this pitch.`;
  }

  return `Toss: ${edgeTeam.code} gets a useful decision advantage.`;
}

function formatPlayerNames(players) {
  return players.map((player) => player.name).join(", ");
}

function getKeyPlayerText(winner, loser, winnerScore, loserScore) {
  const winnerPlayers = getKeyPlayers(winner);
  const loserPlayers = getKeyPlayers(loser);
  const diff = winnerScore.keyPlayers - loserScore.keyPlayers;
  const winnerNames = `${formatPlayerNames(winnerPlayers.batters)}; ${formatPlayerNames(
    winnerPlayers.bowlers
  )}`;
  const loserNames = `${formatPlayerNames(loserPlayers.batters)}; ${formatPlayerNames(
    loserPlayers.bowlers
  )}`;

  if (Math.abs(diff) < 3) {
    return `Key Player Advantage: Close. ${winner.code}: ${winnerNames}. ${loser.code}: ${loserNames}.`;
  }

  if (diff > 0) {
    return `Key Player Advantage: ${winner.code} edge through ${winnerNames}.`;
  }

  return `Key Player Advantage: ${loser.code} edge through ${loserNames}.`;
}

function buildExplanation(winner, loser, conditions, winnerScore, loserScore) {
  const strongerAreas = [
    ["batting", winnerScore.batting - loserScore.batting],
    ["bowling", winnerScore.bowling - loserScore.bowling],
    ["recent form", winnerScore.recentForm - loserScore.recentForm],
    ["match conditions", winnerScore.tossPitch - loserScore.tossPitch],
    ["key players", winnerScore.keyPlayers - loserScore.keyPlayers],
  ]
    .filter(([, diff]) => diff > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label]) => label);

  const mainReason =
    strongerAreas.length > 0
      ? `stronger ${strongerAreas.join(" and ")}`
      : "a slightly better overall weighted score";

  const venueText =
    winner.homeVenue === conditions.venue
      ? `Venue: ${winner.code} gets home advantage at ${conditions.venue}.`
      : loser.homeVenue === conditions.venue
        ? `Venue: ${loser.code} has the home venue, but ${winner.code} rates better overall.`
        : "Venue: No direct home advantage for either team.";

  const tossText =
    getTossText(winner, loser, conditions, winnerScore, loserScore);

  return {
    summary: `${winner.name} is predicted to win because ${winner.code} has ${mainReason}.`,
    keyFactors: [
      getSimpleEdgeText(
        "Batting",
        winnerScore.batting,
        loserScore.batting,
        winner,
        loser,
        "both teams are close"
      ),
      getSimpleEdgeText(
        "Bowling",
        winnerScore.bowling,
        loserScore.bowling,
        winner,
        loser,
        "both attacks are close"
      ),
      getKeyPlayerText(winner, loser, winnerScore, loserScore),
      venueText,
      getPitchText(winner, loser, conditions, winnerScore, loserScore),
      tossText,
    ],
  };
}

export function predictMatch({ teamA, teamB, venue, pitchType, timing, toss, tossDecision }) {
  const conditions = {
    teamA,
    teamB,
    venue,
    pitchType,
    timing,
    toss,
    tossDecision,
  };

  const breakdownA = getScoreBreakdown(teamA, conditions);
  const breakdownB = getScoreBreakdown(teamB, conditions);
  const scoreA = getWeightedScoreFromBreakdown(breakdownA);
  const scoreB = getWeightedScoreFromBreakdown(breakdownB);

  const winner = scoreA >= scoreB ? teamA : teamB;
  const loser = winner.id === teamA.id ? teamB : teamA;
  const winnerBreakdown = winner.id === teamA.id ? breakdownA : breakdownB;
  const loserBreakdown = winner.id === teamA.id ? breakdownB : breakdownA;
  const diff = Math.abs(scoreA - scoreB);
  const probability = Math.round(clamp(50 + diff * 0.85, 51, 82));

  let confidence = "Low";
  if (probability >= 68) {
    confidence = "High";
  } else if (probability >= 58) {
    confidence = "Medium";
  }

  return {
    match: `${teamA.name} vs ${teamB.name}`,
    winner,
    loser,
    probability,
    confidence,
    teamScores: {
      [teamA.id]: Number(scoreA.toFixed(1)),
      [teamB.id]: Number(scoreB.toFixed(1)),
    },
    factors: buildFactors(teamA, teamB, venue, pitchType, conditions),
    explanation: buildExplanation(
      winner,
      loser,
      conditions,
      winnerBreakdown,
      loserBreakdown
    ),
  };
}
