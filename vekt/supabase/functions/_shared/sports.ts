// The sport catalog: positions, systems (formations, schemes, styles), hard
// skills, measurables and personal-best events for every sport VEKT covers.
// One source for the athlete profile, the club director's evaluation and the
// college program's settings, so all three describe a player the same way.
// Plain TypeScript (no Deno globals): shared by the functions and the app.

/** Hard skills are described in words, never scored. */
export const SKILL_LEVELS = [
  { key: "strength", label: "Strength", hint: "One of the best parts of their game" },
  { key: "solid", label: "Solid", hint: "Reliable at the level they play now" },
  { key: "developing", label: "Developing", hint: "Improving, not consistent yet" },
  { key: "not_yet", label: "Not yet", hint: "Not part of their game yet" },
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number]["key"];

export interface Option { key: string; label: string }
export interface Position extends Option { group?: string }
/** A choice the athlete is comfortable in and the program runs (multi-select). */
export interface SystemGroup { key: string; label: string; options: string[] }
/** Hard skills; `groups` limits a skill set to some position groups. */
export interface SkillSet { label: string; groups?: string[]; skills: Option[] }
export interface Measurable { key: string; label: string; unit: string; lowerIsBetter?: boolean; groups?: string[] }
export interface Attribute { key: string; label: string; options: string[]; multi?: boolean; groups?: string[] }
export interface Sport {
  key: string;
  label: string;
  /** What the "position" picker is called: Position, Event group, Weight class... */
  positionLabel: string;
  positions: Position[];
  systems: SystemGroup[];
  skills: SkillSet[];
  measurables: Measurable[];
  attributes: Attribute[];
  /** Individual sports: events with personal bests (time, mark or score). */
  events?: { key: string; label: string; unit: "time" | "distance" | "height" | "score" | "points" }[];
}

const o = (...labels: string[]): Option[] => labels.map((l) => ({ key: l.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), label: l }));
const p = (group: string, ...labels: string[]): Position[] => o(...labels).map((x) => ({ ...x, group }));
const HEIGHT: Measurable = { key: "height", label: "Height", unit: "in" };
const WEIGHT: Measurable = { key: "weight", label: "Weight", unit: "lb" };
const VERT: Measurable = { key: "vertical", label: "Vertical jump", unit: "in" };

export const SPORTS: Sport[] = [
  {
    key: "soccer", label: "Soccer", positionLabel: "Position",
    positions: [...p("gk", "Goalkeeper"), ...p("def", "Center back", "Fullback", "Wingback"), ...p("mid", "Defensive midfielder", "Central midfielder", "Attacking midfielder"), ...p("att", "Winger", "Striker")],
    systems: [
      { key: "formation", label: "Formations", options: ["4-3-3", "4-2-3-1", "4-4-2", "4-4-2 diamond", "4-1-4-1", "3-5-2", "3-4-3", "3-4-2-1", "5-3-2"] },
      { key: "style", label: "Style of play", options: ["High press", "Mid block", "Low block", "Possession build-out", "Direct play", "Counterattack"] },
    ],
    skills: [
      { label: "Every position", skills: o("First touch", "Passing range", "Weak foot", "Scanning and decision speed", "1v1 defending", "Aerial duels", "Work rate off the ball") },
      { label: "Attacking", groups: ["mid", "att", "def"], skills: o("Finishing", "1v1 dribbling", "Crossing", "Movement off the ball", "Final pass") },
      { label: "Defending", groups: ["def", "mid"], skills: o("Positioning", "Recovery runs", "Playing out under pressure", "Organizing the line") },
      { label: "Goalkeeping", groups: ["gk"], skills: o("Shot stopping", "Distribution", "Command of the box", "Footwork", "Playing with feet") },
    ],
    measurables: [HEIGHT, WEIGHT, { key: "sprint_30m", label: "30m sprint", unit: "s", lowerIsBetter: true }, { key: "yoyo", label: "Yo-Yo IR1 level", unit: "level" }, VERT],
    attributes: [{ key: "foot", label: "Dominant foot", options: ["Right", "Left", "Both"] }],
  },
  {
    key: "basketball", label: "Basketball", positionLabel: "Position",
    positions: [...p("guard", "Point guard", "Shooting guard"), ...p("wing", "Small forward"), ...p("big", "Power forward", "Center")],
    systems: [
      { key: "offense", label: "Offense", options: ["Motion", "5-out", "4-out 1-in", "Pick-and-roll heavy", "Dribble drive", "Princeton", "Inside-out post", "Transition / pace"] },
      { key: "defense", label: "Defense", options: ["Man-to-man", "Pack line", "Switch everything", "2-3 zone", "1-3-1 zone", "Matchup zone", "Full-court press"] },
    ],
    skills: [
      { label: "Every position", skills: o("Catch-and-shoot", "Shooting off the dribble", "Finishing at the rim", "Ball handling", "Passing and vision", "On-ball defense", "Help defense", "Rebounding", "Free throws") },
      { label: "Bigs", groups: ["big"], skills: o("Post moves", "Rim protection", "Screening and rolling") },
      { label: "Guards", groups: ["guard"], skills: o("Running the offense", "Pick-and-roll reads") },
    ],
    measurables: [HEIGHT, WEIGHT, { key: "wingspan", label: "Wingspan", unit: "in" }, { key: "reach", label: "Standing reach", unit: "in" }, { key: "max_vert", label: "Max vertical", unit: "in" }, { key: "lane_agility", label: "Lane agility", unit: "s", lowerIsBetter: true }, { key: "sprint_34", label: "3/4-court sprint", unit: "s", lowerIsBetter: true }],
    attributes: [{ key: "hand", label: "Shooting hand", options: ["Right", "Left"] }],
  },
  {
    key: "football", label: "Football", positionLabel: "Position",
    positions: [...p("qb", "Quarterback"), ...p("skill", "Running back", "Wide receiver", "Tight end"), ...p("ol", "Offensive line"), ...p("dl", "Defensive line", "Edge rusher"), ...p("lb", "Linebacker"), ...p("db", "Cornerback", "Safety"), ...p("st", "Kicker", "Punter", "Long snapper")],
    systems: [
      { key: "offense", label: "Offense", options: ["Spread", "Air raid", "RPO-heavy", "Pro-style", "West Coast", "Pistol", "Option", "Wing-T", "Run-and-shoot"] },
      { key: "defense", label: "Defense", options: ["4-3", "3-4", "4-2-5", "3-3-5", "Nickel / dime heavy", "Cover 2", "Cover 3", "Quarters", "Press man"] },
    ],
    skills: [
      { label: "Quarterback", groups: ["qb"], skills: o("Accuracy", "Arm strength", "Pocket presence", "Reading coverage", "Throwing on the move", "Running ability") },
      { label: "Ball carriers and receivers", groups: ["skill"], skills: o("Route running", "Hands", "Yards after catch", "Vision", "Ball security", "Blocking") },
      { label: "Line play", groups: ["ol", "dl"], skills: o("Hand use", "Pad level", "Run blocking", "Pass protection", "Pass-rush moves", "Run defense") },
      { label: "Back seven", groups: ["lb", "db"], skills: o("Man coverage", "Zone coverage", "Tackling", "Ball skills", "Run fits", "Blitzing") },
      { label: "Specialists", groups: ["st"], skills: o("Leg strength", "Kicking accuracy", "Hang time", "Consistency under pressure") },
    ],
    measurables: [HEIGHT, WEIGHT, { key: "forty", label: "40-yard dash", unit: "s", lowerIsBetter: true }, { key: "shuttle", label: "Pro shuttle (5-10-5)", unit: "s", lowerIsBetter: true }, VERT, { key: "broad", label: "Broad jump", unit: "in" }, { key: "bench_225", label: "Bench press (225 reps)", unit: "reps" }],
    attributes: [{ key: "hand", label: "Throwing / kicking side", options: ["Right", "Left"] }],
  },
  {
    key: "baseball", label: "Baseball", positionLabel: "Position",
    positions: [...p("p", "Right-handed pitcher", "Left-handed pitcher"), ...p("c", "Catcher"), ...p("if", "First base", "Second base", "Shortstop", "Third base"), ...p("of", "Outfield")],
    systems: [
      { key: "pitching_role", label: "Pitching roles", options: ["Weekend starter", "Midweek starter", "Long relief", "Setup", "Closer", "Two-way player"] },
      { key: "offense", label: "Offensive approach", options: ["Power", "Contact / situational", "Small ball", "Aggressive baserunning", "Grind at-bats"] },
    ],
    skills: [
      { label: "Hitting", groups: ["c", "if", "of"], skills: o("Contact", "Power", "Plate discipline", "Hitting with two strikes", "Bunting") },
      { label: "Fielding", groups: ["c", "if", "of"], skills: o("Glove", "Arm strength", "Range", "Footwork", "Baseball IQ") },
      { label: "Catching", groups: ["c"], skills: o("Receiving", "Blocking", "Throwing out runners", "Game calling") },
      { label: "Pitching", groups: ["p"], skills: o("Fastball command", "Secondary pitches", "Pitching from the stretch", "Holding runners", "Fielding the position") },
      { label: "Baserunning", groups: ["c", "if", "of"], skills: o("Speed", "Baserunning instincts") },
    ],
    measurables: [HEIGHT, WEIGHT, { key: "sixty", label: "60-yard dash", unit: "s", lowerIsBetter: true, groups: ["c", "if", "of"] }, { key: "fb_velo", label: "Fastball velocity", unit: "mph", groups: ["p"] }, { key: "exit_velo", label: "Exit velocity", unit: "mph", groups: ["c", "if", "of"] }, { key: "if_velo", label: "Infield velocity", unit: "mph", groups: ["if"] }, { key: "of_velo", label: "Outfield velocity", unit: "mph", groups: ["of"] }, { key: "pop_time", label: "Pop time", unit: "s", lowerIsBetter: true, groups: ["c"] }],
    attributes: [
      { key: "bats", label: "Bats", options: ["Right", "Left", "Switch"] },
      { key: "throws", label: "Throws", options: ["Right", "Left"] },
      { key: "pitches", label: "Pitches", options: ["Four-seam fastball", "Two-seam / sinker", "Cutter", "Slider", "Sweeper", "Curveball", "Changeup", "Splitter"], multi: true, groups: ["p"] },
    ],
  },
  {
    key: "softball", label: "Softball", positionLabel: "Position",
    positions: [...p("p", "Pitcher"), ...p("c", "Catcher"), ...p("if", "First base", "Second base", "Shortstop", "Third base"), ...p("of", "Outfield"), ...p("ut", "Utility")],
    systems: [
      { key: "pitching_role", label: "Pitching roles", options: ["Ace / starter", "Rotation starter", "Relief", "Two-way player"] },
      { key: "offense", label: "Offensive approach", options: ["Power", "Contact / situational", "Short game / slap", "Aggressive baserunning"] },
    ],
    skills: [
      { label: "Hitting", groups: ["c", "if", "of", "ut"], skills: o("Contact", "Power", "Plate discipline", "Slapping", "Bunting") },
      { label: "Fielding", groups: ["c", "if", "of", "ut"], skills: o("Glove", "Arm strength", "Range", "Footwork", "Softball IQ") },
      { label: "Catching", groups: ["c"], skills: o("Receiving and framing", "Blocking", "Throwing out runners", "Game calling") },
      { label: "Pitching", groups: ["p"], skills: o("Command", "Movement", "Changing speeds", "Fielding the position") },
    ],
    measurables: [HEIGHT, { key: "home_first", label: "Home to first", unit: "s", lowerIsBetter: true }, { key: "pitch_speed", label: "Pitch speed", unit: "mph", groups: ["p"] }, { key: "exit_velo", label: "Exit velocity", unit: "mph" }, { key: "pop_time", label: "Pop time", unit: "s", lowerIsBetter: true, groups: ["c"] }],
    attributes: [
      { key: "bats", label: "Bats", options: ["Right", "Left", "Switch", "Left-handed slapper"] },
      { key: "throws", label: "Throws", options: ["Right", "Left"] },
      { key: "pitches", label: "Pitches", options: ["Fastball", "Rise ball", "Drop ball", "Curveball", "Screwball", "Changeup", "Drop curve"], multi: true, groups: ["p"] },
    ],
  },
  {
    key: "volleyball", label: "Volleyball", positionLabel: "Position",
    positions: [...p("front", "Outside hitter", "Opposite / right side", "Middle blocker"), ...p("setter", "Setter"), ...p("back", "Libero", "Defensive specialist")],
    systems: [
      { key: "offense", label: "Offense", options: ["5-1", "6-2", "4-2"] },
      { key: "tempo", label: "Tempo", options: ["Fast tempo", "Mixed tempo", "High ball"] },
      { key: "defense", label: "Defense and blocking", options: ["Perimeter defense", "Rotational defense", "Read blocking", "Commit blocking"] },
    ],
    skills: [
      { label: "Every position", skills: o("Serving", "Serve receive", "Digging", "Court vision", "Communication") },
      { label: "Front row", groups: ["front"], skills: o("Attacking", "Shot selection", "Blocking", "Transition footwork") },
      { label: "Setting", groups: ["setter"], skills: o("Hand setting", "Location and tempo", "Decision-making", "Setter dump") },
      { label: "Back row", groups: ["back"], skills: o("Platform control", "Range", "Out-of-system setting") },
    ],
    measurables: [HEIGHT, { key: "reach", label: "Standing reach", unit: "in" }, { key: "approach", label: "Approach touch", unit: "in" }, { key: "block", label: "Block touch", unit: "in" }, VERT],
    attributes: [{ key: "hand", label: "Dominant hand", options: ["Right", "Left"] }],
  },
  {
    key: "lacrosse", label: "Lacrosse", positionLabel: "Position",
    positions: [...p("att", "Attack"), ...p("mid", "Midfield", "Long-stick midfield"), ...p("def", "Defense"), ...p("fo", "Face-off / draw specialist"), ...p("g", "Goalie")],
    systems: [
      { key: "offense", label: "Offense", options: ["2-3-1", "1-4-1", "2-2-2", "1-3-2", "Motion", "Fast break"] },
      { key: "defense", label: "Defense", options: ["Man-to-man", "Adjacent slides", "Crease slides", "Zone", "Backer zone", "Ride and press"] },
    ],
    skills: [
      { label: "Every position", skills: o("Stick skills (both hands)", "Ground balls", "Clearing", "Lacrosse IQ") },
      { label: "Offense", groups: ["att", "mid"], skills: o("Shooting", "Dodging", "Feeding", "Off-ball movement") },
      { label: "Defense", groups: ["def", "mid"], skills: o("On-ball defense", "Off-ball defense", "Checks", "Communication") },
      { label: "Face-offs and draws", groups: ["fo"], skills: o("Clamp / control", "Exits") },
      { label: "Goalie", groups: ["g"], skills: o("Saves", "Outlet passes", "Directing the defense") },
    ],
    measurables: [HEIGHT, WEIGHT, { key: "forty", label: "40-yard dash", unit: "s", lowerIsBetter: true }, { key: "shuttle", label: "Pro shuttle", unit: "s", lowerIsBetter: true }, { key: "shot_speed", label: "Shot speed", unit: "mph" }],
    attributes: [{ key: "hand", label: "Strong hand", options: ["Right", "Left", "Both"] }],
  },
  {
    key: "ice_hockey", label: "Ice hockey", positionLabel: "Position",
    positions: [...p("f", "Center", "Left wing", "Right wing"), ...p("d", "Defense"), ...p("g", "Goalie")],
    systems: [
      { key: "forecheck", label: "Forecheck", options: ["1-2-2", "2-1-2", "1-3-1", "Neutral-zone trap"] },
      { key: "dzone", label: "Defensive zone", options: ["Man-to-man", "Zone", "Swarm / collapse"] },
      { key: "special", label: "Special teams", options: ["1-3-1 power play", "Umbrella power play", "Box penalty kill", "Diamond penalty kill"] },
    ],
    skills: [
      { label: "Skaters", groups: ["f", "d"], skills: o("Skating speed", "Edges and agility", "Puck handling", "Passing", "Shot release", "Hockey sense", "Physical play", "Defensive positioning") },
      { label: "Goalie", groups: ["g"], skills: o("Positioning", "Rebound control", "Tracking", "Playing the puck", "Recovery") },
    ],
    measurables: [HEIGHT, WEIGHT, VERT, { key: "pro_agility", label: "Pro agility", unit: "s", lowerIsBetter: true }],
    attributes: [{ key: "shoots", label: "Shoots / catches", options: ["Left", "Right"] }],
  },
  {
    key: "field_hockey", label: "Field hockey", positionLabel: "Position",
    positions: [...p("fwd", "Forward"), ...p("mid", "Midfield"), ...p("back", "Back", "Sweeper"), ...p("gk", "Goalkeeper")],
    systems: [
      { key: "formation", label: "Formations", options: ["4-3-3", "3-3-3-1", "4-4-2", "3-4-3", "5-3-2"] },
      { key: "press", label: "Press", options: ["Full press", "Half-court press", "Zonal press", "Man-to-man press"] },
      { key: "corner", label: "Penalty corner role", options: ["Injector", "Stopper", "Hitter", "Drag flicker", "Runner", "Post"] },
    ],
    skills: [
      { label: "Every position", skills: o("Receiving", "Push pass", "Hitting", "Aerials", "Tackling", "Elimination skills", "Vision") },
      { label: "Attacking", groups: ["fwd", "mid"], skills: o("Finishing", "3D skills", "Drag flick") },
      { label: "Goalkeeping", groups: ["gk"], skills: o("Shot stopping", "Clearing", "Corner defense") },
    ],
    measurables: [HEIGHT, { key: "yoyo", label: "Yo-Yo IR1 level", unit: "level" }, { key: "sprint_30m", label: "30m sprint", unit: "s", lowerIsBetter: true }],
    attributes: [],
  },
  {
    key: "water_polo", label: "Water polo", positionLabel: "Position",
    positions: [...p("field", "Center", "Center defender", "Driver", "Utility"), ...p("gk", "Goalkeeper")],
    systems: [
      { key: "offense", label: "Offense", options: ["4-2", "3-3 arc", "Counterattack", "6-on-5 (4-2)", "6-on-5 (3-3)"] },
      { key: "defense", label: "Defense", options: ["Pressing", "Drop / zone", "M-zone"] },
    ],
    skills: [
      { label: "Field players", groups: ["field"], skills: o("Eggbeater", "Swim speed", "Shooting", "Passing", "Ball handling", "Hole set play", "Hole defense", "Drawing exclusions") },
      { label: "Goalkeeper", groups: ["gk"], skills: o("Positioning", "Leg strength", "Outlet passing", "Directing the defense") },
    ],
    measurables: [HEIGHT, { key: "wingspan", label: "Wingspan", unit: "in" }, { key: "free_50", label: "50 free", unit: "s", lowerIsBetter: true }, { key: "free_100", label: "100 free", unit: "s", lowerIsBetter: true }],
    attributes: [{ key: "hand", label: "Shooting hand", options: ["Right", "Left"] }],
  },
  {
    key: "track_field", label: "Track and field", positionLabel: "Event group",
    positions: [...p("sprints", "Sprints"), ...p("hurdles", "Hurdles"), ...p("distance", "Middle distance", "Distance"), ...p("jumps", "Jumps"), ...p("throws", "Throws"), ...p("multi", "Multi-events")],
    systems: [{ key: "season", label: "Seasons competed", options: ["Indoor", "Outdoor", "Cross country"] }],
    skills: [
      { label: "Every event", skills: o("Technique", "Competing in big meets", "Training consistency") },
      { label: "Sprints and hurdles", groups: ["sprints", "hurdles"], skills: o("Start", "Acceleration", "Top-end speed", "Speed endurance", "Hurdle rhythm") },
      { label: "Distance", groups: ["distance"], skills: o("Pacing", "Race tactics", "Finishing kick") },
      { label: "Jumps and throws", groups: ["jumps", "throws", "multi"], skills: o("Approach / entry", "Power", "Rhythm") },
    ],
    measurables: [HEIGHT, WEIGHT],
    attributes: [],
    events: [
      { key: "100m", label: "100m", unit: "time" }, { key: "200m", label: "200m", unit: "time" }, { key: "400m", label: "400m", unit: "time" }, { key: "800m", label: "800m", unit: "time" },
      { key: "1600m", label: "1600m / mile", unit: "time" }, { key: "3200m", label: "3200m", unit: "time" }, { key: "5000m", label: "5000m", unit: "time" },
      { key: "100h", label: "100m / 110m hurdles", unit: "time" }, { key: "300h", label: "300m / 400m hurdles", unit: "time" },
      { key: "hj", label: "High jump", unit: "height" }, { key: "pv", label: "Pole vault", unit: "height" }, { key: "lj", label: "Long jump", unit: "distance" }, { key: "tj", label: "Triple jump", unit: "distance" },
      { key: "sp", label: "Shot put", unit: "distance" }, { key: "dt", label: "Discus", unit: "distance" }, { key: "jt", label: "Javelin", unit: "distance" }, { key: "ht", label: "Hammer", unit: "distance" },
      { key: "multi", label: "Heptathlon / decathlon", unit: "points" },
    ],
  },
  {
    key: "cross_country", label: "Cross country", positionLabel: "Event group",
    positions: p("distance", "Distance"),
    systems: [{ key: "season", label: "Seasons competed", options: ["Cross country", "Indoor track", "Outdoor track"] }],
    skills: [{ label: "Racing", skills: o("Pacing", "Race tactics", "Hills", "Finishing kick", "Training consistency", "Racing in a pack") }],
    measurables: [],
    attributes: [],
    events: [{ key: "5k", label: "5K", unit: "time" }, { key: "6k", label: "6K", unit: "time" }, { key: "1600m", label: "1600m / mile", unit: "time" }, { key: "3200m", label: "3200m", unit: "time" }],
  },
  {
    key: "swimming_diving", label: "Swimming and diving", positionLabel: "Event group",
    positions: [...p("sprint", "Sprint free"), ...p("distance", "Distance free"), ...p("stroke", "Backstroke", "Breaststroke", "Butterfly", "IM"), ...p("dive", "Diving")],
    systems: [{ key: "course", label: "Courses swum", options: ["Short course yards", "Long course meters"] }],
    skills: [
      { label: "Swimming", groups: ["sprint", "distance", "stroke"], skills: o("Starts", "Turns", "Underwaters", "Stroke technique", "Race pacing", "Training consistency") },
      { label: "Diving", groups: ["dive"], skills: o("Approach and hurdle", "Rotation", "Entries", "Degree of difficulty", "Consistency") },
    ],
    measurables: [HEIGHT, { key: "wingspan", label: "Wingspan", unit: "in" }],
    attributes: [],
    events: [
      { key: "50fr", label: "50 free", unit: "time" }, { key: "100fr", label: "100 free", unit: "time" }, { key: "200fr", label: "200 free", unit: "time" }, { key: "500fr", label: "500 free", unit: "time" }, { key: "1650fr", label: "1650 free", unit: "time" },
      { key: "100bk", label: "100 back", unit: "time" }, { key: "200bk", label: "200 back", unit: "time" }, { key: "100br", label: "100 breast", unit: "time" }, { key: "200br", label: "200 breast", unit: "time" },
      { key: "100fl", label: "100 fly", unit: "time" }, { key: "200fl", label: "200 fly", unit: "time" }, { key: "200im", label: "200 IM", unit: "time" }, { key: "400im", label: "400 IM", unit: "time" },
      { key: "1m", label: "1m diving (11 dives)", unit: "score" }, { key: "3m", label: "3m diving (11 dives)", unit: "score" },
    ],
  },
  {
    key: "tennis", label: "Tennis", positionLabel: "Plays",
    positions: p("player", "Singles", "Doubles"),
    systems: [{ key: "style", label: "Game style", options: ["Aggressive baseliner", "Counterpuncher", "All-court", "Serve and volley", "Big server"] }],
    skills: [{ label: "Game", skills: o("First serve", "Second serve", "Return", "Forehand", "Backhand", "Net play", "Movement", "Match management") }],
    measurables: [HEIGHT, { key: "utr", label: "UTR", unit: "UTR" }, { key: "serve_speed", label: "First-serve speed", unit: "mph" }],
    attributes: [{ key: "hand", label: "Plays", options: ["Right-handed", "Left-handed"] }, { key: "backhand", label: "Backhand", options: ["One-handed", "Two-handed"] }],
  },
  {
    key: "golf", label: "Golf", positionLabel: "Plays",
    positions: p("player", "Individual"),
    systems: [],
    skills: [{ label: "Game", skills: o("Driving distance", "Driving accuracy", "Iron play", "Short game", "Putting", "Course management", "Tournament composure") }],
    measurables: [{ key: "scoring_avg", label: "Tournament scoring average", unit: "strokes", lowerIsBetter: true }, { key: "handicap", label: "Handicap index", unit: "", lowerIsBetter: true }, { key: "best_18", label: "Best 18-hole tournament round", unit: "strokes", lowerIsBetter: true }, { key: "drive", label: "Average drive", unit: "yd" }],
    attributes: [{ key: "hand", label: "Plays", options: ["Right-handed", "Left-handed"] }],
  },
  {
    key: "wrestling", label: "Wrestling", positionLabel: "Weight class",
    positions: p("wt", "106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"),
    systems: [{ key: "style", label: "Styles wrestled", options: ["Folkstyle", "Freestyle", "Greco-Roman"] }],
    skills: [{ label: "Wrestling", skills: o("Takedowns (neutral)", "Riding (top)", "Escapes (bottom)", "Scrambling", "Conditioning", "Mat awareness") }],
    measurables: [HEIGHT, { key: "wins", label: "Varsity wins", unit: "wins" }, { key: "losses", label: "Varsity losses", unit: "losses" }],
    attributes: [{ key: "stance", label: "Stance", options: ["Left lead", "Right lead", "Square"] }],
  },
  {
    key: "rowing", label: "Rowing", positionLabel: "Seat",
    positions: [...p("rower", "Port", "Starboard", "Both sides", "Sculler"), ...p("cox", "Coxswain")],
    systems: [{ key: "boats", label: "Boats rowed", options: ["8+", "4+", "4-", "2-", "1x", "2x", "4x"] }],
    skills: [
      { label: "Rowers", groups: ["rower"], skills: o("Technique", "Rhythm and ratio", "Fitness base", "Racing grit") },
      { label: "Coxswains", groups: ["cox"], skills: o("Steering", "Race calls", "Technical coaching", "Leadership") },
    ],
    measurables: [HEIGHT, WEIGHT, { key: "erg_2k", label: "2k erg", unit: "time", lowerIsBetter: true, groups: ["rower"] }, { key: "erg_6k", label: "6k erg", unit: "time", lowerIsBetter: true, groups: ["rower"] }],
    attributes: [],
  },
  {
    key: "gymnastics", label: "Gymnastics", positionLabel: "Events",
    positions: p("gym", "All-around", "Vault", "Bars", "Beam", "Floor"),
    systems: [{ key: "level", label: "Competitive level", options: ["Level 10", "Development Program", "Elite", "Xcel Sapphire", "Xcel Diamond"] }],
    skills: [{ label: "Events", skills: o("Vault", "Uneven bars", "Balance beam", "Floor exercise", "Execution", "Difficulty", "Consistency") }],
    measurables: [HEIGHT],
    attributes: [],
    events: [{ key: "vault", label: "Vault", unit: "score" }, { key: "bars", label: "Bars", unit: "score" }, { key: "beam", label: "Beam", unit: "score" }, { key: "floor", label: "Floor", unit: "score" }, { key: "aa", label: "All-around", unit: "score" }],
  },
];

const ALIASES: Record<string, string> = {
  hockey: "ice_hockey", icehockey: "ice_hockey", fieldhockey: "field_hockey", waterpolo: "water_polo", track: "track_field",
  trackandfield: "track_field", trackfield: "track_field", xc: "cross_country", crosscountry: "cross_country",
  swimming: "swimming_diving", swim: "swimming_diving", diving: "swimming_diving", swimminganddiving: "swimming_diving",
  crew: "rowing", mlax: "lacrosse", wlax: "lacrosse",
};

/** Finds a sport from free text like "Soccer", "ice hockey" or "Track & Field". */
export function sportFor(name: string | null | undefined): Sport | null {
  const k = (name || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  return SPORTS.find((s) => s.key.replace(/_/g, "") === k || s.label.toLowerCase().replace(/[^a-z]/g, "") === k)
    ?? SPORTS.find((s) => s.key === ALIASES[k]) ?? null;
}

/** The position group for a position label (e.g. "Center back" -> "def"). */
export function groupOf(sport: Sport, position: string | null | undefined): string | null {
  const n = (position || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return sport.positions.find((x) => x.label.toLowerCase().replace(/[^a-z0-9]/g, "") === n || x.key.replace(/_/g, "") === n)?.group ?? null;
}

const applies = (groups: string[] | undefined, mine: string[]) => !groups?.length || !mine.length || groups.some((g) => mine.includes(g));

/** The skills, measurables and attributes that apply to these positions. */
export function forPositions(sport: Sport, positions: (string | null | undefined)[]) {
  const mine = positions.map((x) => groupOf(sport, x)).filter((g): g is string => !!g);
  return {
    skills: sport.skills.filter((s) => applies(s.groups, mine)),
    measurables: sport.measurables.filter((m) => applies(m.groups, mine)),
    attributes: sport.attributes.filter((a) => applies(a.groups, mine)),
  };
}
