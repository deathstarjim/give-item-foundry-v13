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

// renderActorSheetV2 fires for all ApplicationV2-based actor sheets —
// covers the dnd5e v4 default sheet and Tidy5e with a single hook.
Hooks.on('renderActorSheetV2', (sheet, html) =>
{
  if (sheet.actor?.type !== 'character') return;
  if (!game.settings.get('give-item', 'enabled')) return;
  if (!sheet.actor.isOwner) return;
  addGiveItemButton(html, sheet.actor);
  addGiveCurrency(html, sheet.actor);
});

// NPC sheets — GM can flag NPCs as receivable.
// renderActorSheetV2 also fires for NPC sheets, so one hook covers both
// the dnd5e v4 default NPC sheet and Tidy5e NPC sheet.
Hooks.on('renderActorSheetV2', (sheet, html) =>
{
  if (sheet.actor?.type !== 'npc') return;
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

    // PC-to-PC trade flow — skip entirely for the GM
    if (!game.user.isGM && data.actor?.isOwner)
    {
      if (type === 'request') receiveTrade(data);
      if (type === 'accepted') completeTrade(data);
      if (type === 'denied') denyTrade(data);
    }
  });
});
