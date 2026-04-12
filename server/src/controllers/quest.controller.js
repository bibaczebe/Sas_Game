const Character   = require('../models/Character.model');
const QuestEngine = require('../services/QuestEngine.service');

// GET /api/quests
async function listQuests(req, res, next) {
  try {
    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const quests = await QuestEngine.listAvailable(character._id, character.level);
    res.json({ quests });
  } catch (err) {
    next(err);
  }
}

// POST /api/quests/:questId/start
async function startQuest(req, res, next) {
  try {
    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const { questId } = req.params;
    const result = await QuestEngine.startQuest(character._id, questId);

    res.json({
      questId,
      questName:   result.quest.name,
      stageId:     result.stage.id,
      stageType:   result.stage.type,
      stageText:   result.stage.text,
      choices:     result.stage.choices?.map((c, i) => ({ index: i, text: c.text })) || [],
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/quests/:questId/choice  { choiceIndex }
async function makeChoice(req, res, next) {
  try {
    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const { questId }    = req.params;
    const { choiceIndex } = req.body;

    if (choiceIndex === undefined || choiceIndex === null) {
      return res.status(400).json({ error: 'choiceIndex is required' });
    }

    const result = await QuestEngine.makeChoice(character._id, questId, parseInt(choiceIndex, 10));

    res.json({
      completed:    result.completed,
      fled:         result.fled ?? false,
      stageId:      result.stage?.id,
      stageType:    result.stage?.type,
      stageText:    result.stage?.text,
      choices:      result.stage?.choices?.map((c, i) => ({ index: i, text: c.text })) || [],
      effects:      result.effectSummary?.changes || {},
      reward:       result.reward || null,
      levelResult:  result.levelResult
        ? {
            leveled:          result.levelResult.leveled,
            newLevel:         result.levelResult.newLevel,
            statPointsGained: result.levelResult.statPointsGained,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/quests/:questId/current
async function getCurrentStage(req, res, next) {
  try {
    const character = await Character.findOne({ userId: req.userId });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const result = await QuestEngine.getCurrentStage(character._id, req.params.questId);
    if (!result) return res.status(404).json({ error: 'Quest not active' });

    res.json({
      questId:   result.quest.id,
      questName: result.quest.name,
      stageId:   result.stage.id,
      stageType: result.stage.type,
      stageText: result.stage.text,
      choices:   result.stage.choices?.map((c, i) => ({ index: i, text: c.text })) || [],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listQuests, startQuest, makeChoice, getCurrentStage };
