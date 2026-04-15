import { fetchRecipients } from './actorOverride.js';

const { DialogV2 } = foundry.applications.api;

// ── Give Item ─────────────────────────────────────────────────────────────────

export async function showGiveItemDialog(actor, itemId)
{
  const currentItem = actor.items.get(itemId);
  if (!currentItem) return;

  const recipients = fetchRecipients(actor);
  if (recipients.length === 0)
  {
    return ui.notifications.warn('No valid recipients found. Make sure other players have characters assigned, or ask your GM to flag an NPC.');
  }

  const options = recipients
    .map(r => `<option value="${r.id}">${foundry.utils.escapeHTML(r.name)}</option>`)
    .join('');

  const content = `
    <form class="give-item-form">
      <div class="form-group">
        <label>Recipient</label>
        <select name="recipient">${options}</select>
      </div>
      <div class="form-group">
        <label>Quantity</label>
        <input type="number" name="quantity" value="1" min="1" max="${currentItem.system.quantity ?? 1}">
      </div>
    </form>`;

  const result = await DialogV2.wait({
    window: { title: `Give: ${currentItem.name}` },
    content,
    buttons: [
      {
        action: 'submit',
        label: 'Offer Item',
        icon: 'fas fa-check',
        default: true,
        callback: (_event, _button, dialog) =>
        {
          return new FormDataExtended(dialog.querySelector('form')).object;
        }
      },
      { action: 'cancel', label: 'Cancel', icon: 'fas fa-times' }
    ],
    rejectClose: false
  });

  if (!result || result === 'cancel') return;

  const { recipient, quantity } = result;
  const qty = Math.floor(Number(quantity));

  if (!Number.isInteger(qty) || qty < 1)
  {
    return ui.notifications.error('Invalid quantity.');
  }

  const currentQuantity = currentItem.system.quantity ?? 0;
  if (qty > currentQuantity)
  {
    return ui.notifications.error('You cannot offer more items than you have.');
  }

  const recipientActor = game.actors.get(recipient);
  if (!recipientActor) return;

  const isNPC = recipientActor.type !== 'character';

  game.socket.emit('module.give-item', {
    data: { currentItem: currentItem.toObject(), quantity: qty },
    actorId: recipient,
    currentActorId: actor.id,
    type: isNPC ? 'npc-request' : 'request'
  });

  if (isNPC)
  {
    ui.notifications.info(`Offering ${qty}x ${currentItem.name} to ${recipientActor.name}…`);
  }
}

// ── Give Currency ─────────────────────────────────────────────────────────────

export async function showGiveCurrencyDialog(actor)
{
  const recipients = fetchRecipients(actor);
  if (recipients.length === 0)
  {
    return ui.notifications.warn('No valid recipients found.');
  }

  const options = recipients
    .map(r => `<option value="${r.id}">${foundry.utils.escapeHTML(r.name)}</option>`)
    .join('');

  const currency = actor.system.currency ?? {};

  const content = `
    <form class="give-item-form give-currency-form">
      <div class="form-group">
        <label>Recipient</label>
        <select name="recipient">${options}</select>
      </div>
      <div class="form-group currency-row">
        <label>PP</label>
        <input type="number" name="pp" value="0" min="0" max="${currency.pp ?? 0}">
        <label>GP</label>
        <input type="number" name="gp" value="0" min="0" max="${currency.gp ?? 0}">
        <label>EP</label>
        <input type="number" name="ep" value="0" min="0" max="${currency.ep ?? 0}">
        <label>SP</label>
        <input type="number" name="sp" value="0" min="0" max="${currency.sp ?? 0}">
        <label>CP</label>
        <input type="number" name="cp" value="0" min="0" max="${currency.cp ?? 0}">
      </div>
    </form>`;

  const result = await DialogV2.wait({
    window: { title: 'Give Currency' },
    content,
    buttons: [
      {
        action: 'submit',
        label: 'Offer Currency',
        icon: 'fas fa-check',
        default: true,
        callback: (_event, _button, dialog) =>
        {
          return new FormDataExtended(dialog.querySelector('form')).object;
        }
      },
      { action: 'cancel', label: 'Cancel', icon: 'fas fa-times' }
    ],
    rejectClose: false
  });

  if (!result || result === 'cancel') return;

  const { recipient, pp = 0, gp = 0, ep = 0, sp = 0, cp = 0 } = result;
  const amounts = {
    pp: Math.floor(Number(pp)),
    gp: Math.floor(Number(gp)),
    ep: Math.floor(Number(ep)),
    sp: Math.floor(Number(sp)),
    cp: Math.floor(Number(cp))
  };

  // Validate — nothing offered
  if (Object.values(amounts).every(v => v === 0))
  {
    return ui.notifications.warn('No currency amount entered.');
  }

  // Validate — not enough
  const cur = actor.system.currency ?? {};
  if (amounts.pp > (cur.pp ?? 0) || amounts.gp > (cur.gp ?? 0) ||
    amounts.ep > (cur.ep ?? 0) || amounts.sp > (cur.sp ?? 0) ||
    amounts.cp > (cur.cp ?? 0))
  {
    return ui.notifications.error('You cannot offer more currency than you have.');
  }

  const recipientActor = game.actors.get(recipient);
  if (!recipientActor) return;

  const isNPC = recipientActor.type !== 'character';

  game.socket.emit('module.give-item', {
    data: { quantity: amounts },
    actorId: recipient,
    currentActorId: actor.id,
    type: isNPC ? 'npc-request' : 'request'
  });

  if (isNPC)
  {
    ui.notifications.info(`Offering currency to ${recipientActor.name}…`);
  }
}


