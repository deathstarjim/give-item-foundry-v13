import { addGiveItemButton, addGiveCurrency, addNPCReceiveToggle } from './actorOverride.js';
import { completeTrade, denyTrade, receiveTrade, completeNPCTrade, notifyNPCTradeComplete } from './trading.js';

Hooks.on('init', function ()
{
  game.settings.register('give-item', 'enabled', {
    name: 'Enable Give Item',
    hint: 'Allow player characters to give items and currency to other players or designated NPCs.',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
  });
});

// dnd5e v4 default character sheet (ApplicationV2)
Hooks.on('renderActorSheet5eCharacter2', (sheet, html) =>
{
  if (!game.settings.get('give-item', 'enabled')) return;
  if (!sheet.actor.isOwner) return;
  addGiveItemButton(html, sheet.actor);
  addGiveCurrency(html, sheet.actor);
});

// Tidy5e Sheets character sheet
Hooks.on('renderTidy5eCharacterSheet', (sheet, html) =>
{
  if (!game.settings.get('give-item', 'enabled')) return;
  if (!sheet.actor.isOwner) return;
  addGiveItemButton(html, sheet.actor);
  addGiveCurrency(html, sheet.actor);
});

// dnd5e v4 default NPC sheet — GM can flag NPCs as receivable
Hooks.on('renderActorSheet5eNPC2', (sheet, html) =>
{
  if (!game.user.isGM) return;
  addNPCReceiveToggle(html, sheet.actor);
});

// Tidy5e NPC sheet
Hooks.on('renderTidy5eNpcSheet', (sheet, html) =>
{
  if (!game.user.isGM) return;
  addNPCReceiveToggle(html, sheet.actor);
});

Hooks.once('setup', function ()
{
  game.socket.on('module.give-item', packet =>
  {
    const { data, type, actorId, currentActorId } = packet;
    data.actor = game.actors.get(actorId);
    data.currentActor = game.actors.get(currentActorId);

    // NPC trade: only the GM processes it directly (no accept/deny dialog)
    if (type === 'npc-request')
    {
      if (game.user.isGM)
      {
        completeNPCTrade(data);
      }
      return;
    }

    // Notify original sender that NPC trade finished
    if (type === 'npc-complete')
    {
      if (data.actor?.isOwner)
      {
        notifyNPCTradeComplete(data);
      }
      return;
    }

    // PC-to-PC trade flow
    if (data.actor?.isOwner)
    {
      if (type === 'request') receiveTrade(data);
      if (type === 'accepted') completeTrade(data);
      if (type === 'denied') denyTrade(data);
    }
  });
});
