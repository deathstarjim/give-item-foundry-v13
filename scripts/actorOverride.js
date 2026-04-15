import { showGiveItemDialog, showGiveCurrencyDialog } from './dialog.js';

// Resolve both raw HTMLElement (ApplicationV2 sheets) and jQuery-wrapped elements.
function toElement(html)
{
  if (typeof jQuery !== 'undefined' && html instanceof jQuery) return html[0];
  return html instanceof HTMLElement ? html : null;
}

// ── Item give buttons ─────────────────────────────────────────────────────────

export function addGiveItemButton(html, actor)
{
  const el = toElement(html);
  if (!el) return;

  // Target inventory-tab items only; skip spells/features.
  // Both the dnd5e v4 default sheet and Tidy5e use [data-tab="inventory"] or
  // .tab.inventory to wrap the inventory pane.
  const inventoryPane =
    el.querySelector('.tab[data-tab="inventory"]') ??
    el.querySelector('.tab.inventory') ??
    el; // fall back to full sheet so nothing is missed

  inventoryPane.querySelectorAll('[data-item-id]').forEach(itemEl =>
  {
    const controls = itemEl.querySelector('.item-controls');
    if (!controls) return;
    if (controls.querySelector('.item-give-module')) return; // already injected

    const btn = document.createElement('a');
    btn.className = 'item-control item-give-module';
    btn.title = 'Give Item';
    btn.setAttribute('data-tooltip', 'Give Item');
    btn.innerHTML = '<i class="fas fa-handshake-angle"></i>';
    btn.addEventListener('click', e =>
    {
      e.preventDefault();
      e.stopPropagation();
      showGiveItemDialog(actor, itemEl.dataset.itemId);
    });
    controls.appendChild(btn);
  });
}

// ── Currency give button ──────────────────────────────────────────────────────

export function addGiveCurrency(html, actor)
{
  const el = toElement(html);
  if (!el) return;

  const currencySection = el.querySelector('.currency');
  if (!currencySection) return;
  if (currencySection.querySelector('.give-currency-btn')) return; // already injected

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'give-currency-btn';
  btn.title = 'Give Currency';
  btn.setAttribute('data-tooltip', 'Give Currency');
  btn.innerHTML = '<i class="fas fa-handshake-angle"></i>';
  btn.addEventListener('click', e =>
  {
    e.preventDefault();
    showGiveCurrencyDialog(actor);
  });
  currencySection.appendChild(btn);
}

// ── NPC "allow receive" toggle (GM only) ──────────────────────────────────────

export function addNPCReceiveToggle(html, actor)
{
  const el = toElement(html);
  if (!el) return;

  // Insert near the sheet header — works for both dnd5e v4 and Tidy5e NPC sheets.
  const header =
    el.querySelector('.sheet-header') ??
    el.querySelector('.window-content') ??
    el;

  if (header.querySelector('.give-item-npc-toggle')) return; // already injected

  const flagged = actor.getFlag('give-item', 'allowReceive') ?? false;

  const wrapper = document.createElement('div');
  wrapper.className = 'give-item-npc-toggle form-group';
  wrapper.innerHTML = `
    <label class="checkbox">
      <input type="checkbox" ${flagged ? 'checked' : ''}>
      Players can give items to this NPC
    </label>`;

  wrapper.querySelector('input').addEventListener('change', e =>
  {
    actor.setFlag('give-item', 'allowReceive', e.target.checked);
  });

  header.prepend(wrapper);
}

// ── Recipient list (exported for dialog use) ──────────────────────────────────

export function fetchRecipients(currentActor)
{
  const recipients = [];

  // Player characters (online players with an assigned character, excluding self)
  game.users.filter(u => !u.isGM).forEach(user =>
  {
    if (user.character && user.character.id !== currentActor.id)
    {
      recipients.push({ id: user.character.id, name: user.character.name, type: 'pc' });
    }
  });

  // NPCs flagged by the GM as receivable
  game.actors
    .filter(a => a.type === 'npc' && a.getFlag('give-item', 'allowReceive'))
    .forEach(npc =>
    {
      recipients.push({ id: npc.id, name: `${npc.name} (NPC)`, type: 'npc' });
    });

  return recipients;
}
