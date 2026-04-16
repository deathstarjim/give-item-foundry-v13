import { showGiveItemDialog, showGiveCurrencyDialog } from './dialog.js';

// Resolve both raw HTMLElement (ApplicationV2 sheets) and jQuery-wrapped elements.
function toElement(html)
{
  if (typeof jQuery !== 'undefined' && html instanceof jQuery) return html[0];
  return html instanceof HTMLElement ? html : null;
}

// ── Item give buttons ─────────────────────────────────────────────────────────

// Physical item types we want to show the give button on.
const PHYSICAL_TYPES = new Set(['weapon', 'equipment', 'consumable', 'tool', 'loot', 'container', 'backpack']);

export function addGiveItemButton(html, actor)
{
  const el = toElement(html);
  if (!el) return;

  const inventoryPane =
    el.querySelector('[data-tab="inventory"]') ??
    el.querySelector('.tab.inventory') ??
    el;

  inventoryPane.querySelectorAll('[data-item-id]').forEach(itemEl =>
  {
    const itemId = itemEl.dataset.itemId;
    const item = actor.items.get(itemId);
    if (!item || !PHYSICAL_TYPES.has(item.type)) return;

    // dnd5e v4 default sheet uses [data-column-id="controls"]
    // Tidy5e uses [data-tidy-column-key="actions"] or .tidy-table-actions
    const controlsCell =
      itemEl.querySelector('[data-column-id="controls"]') ??
      itemEl.querySelector('[data-tidy-column-key="actions"]') ??
      itemEl.querySelector('.tidy-table-actions') ??
      itemEl.querySelector('.item-controls');

    if (!controlsCell) return;
    if (controlsCell.querySelector('.item-give-module')) return; // already injected

    const btn = document.createElement('a');
    btn.className = 'item-control item-give-module item-action unbutton';
    btn.title = 'Give Item';
    btn.setAttribute('data-tooltip', 'Give Item');
    btn.innerHTML = '<i class="fas fa-handshake-angle"></i>';
    btn.addEventListener('click', e =>
    {
      e.preventDefault();
      e.stopPropagation();
      showGiveItemDialog(actor, itemId);
    });

    // Insert before the context-menu button if present, otherwise append.
    const contextMenuBtn = controlsCell.querySelector('[data-context-menu]');
    if (contextMenuBtn)
      controlsCell.insertBefore(btn, contextMenuBtn);
    else
      controlsCell.appendChild(btn);
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

  // Characters assigned to a user account (excluding self).
  // Using user.character means only "real" PCs appear — not random
  // character-type monsters or unassigned actors.
  game.users
    .filter(u => !u.isGM && u.character && u.character.id !== currentActor.id)
    .forEach(u => recipients.push({ id: u.character.id, name: u.character.name, type: 'pc' }));

  // NPCs flagged by the GM as receivable
  game.actors
    .filter(a => a.type === 'npc' && a.getFlag('give-item', 'allowReceive'))
    .forEach(npc => recipients.push({ id: npc.id, name: `${npc.name} (NPC)`, type: 'npc' }));

  return recipients;
}
