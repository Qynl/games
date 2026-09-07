// tools — shared scene catalogue for the quick-build UI.
//
// The AI-side tool vocabulary and dispatcher live in AIController.runTool
// (documented in ai/prompts.ts as ACTOR_TOOLS). These labels are what the
// RecipeEngine can materialize, so both the editor quick-build buttons and
// the AI's createGame tool stay consistent.

export const GAME_SCENES: string[] = [
  'maze',
  'parkour',
  'obstacle course',
  'coin run',
  'floating islands',
  'racing track',
  'bowling alley',
  'shooting gallery',
  'red light green light',
  'dodge alley',
  'speedrun',
  'plaza',
  'farm',
  'graveyard',
  'house',
  'night camp',
  'rainy day',
]
