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

  < div class="give-item-dialog currency" >
      <label>Platinium:</label>
      <input type=number id="pp" name="pp" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Gold:</label>
      <input type=number id="gp" name="gp" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Electrum:</label>
      <input type=number id="ep" name="ep" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Silver:</label>
      <input type=number id="sp" name="sp" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Copper:</label>
      <input type=number id="cp" name="cp" value="">
    </div>`;

    const currencyPFTemplate = `
  < div class="give-item-dialog currency" >
      <label>Platinium:</label>
      <input type=number id="pp" name="pp" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Gold:</label>
      <input type=number id="gp" name="gp" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Silver:</label>
      <input type=number id="sp" name="sp" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Copper:</label>
      <input type=number id="cp" name="cp" value="">
    </div>`;

    const currencyWFRP4ETemplate = `
  < div class="give-item-dialog currency" >
      <label>Gold Crown:</label>
      <input type=number id="gc" name="gc" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Silver Shilling:</label>
      <input type=number id="ss" name="ss" value="">
    </div>
    <div class="give-item-dialog currency">
      <label>Brass Penny:</label>
      <input type=number id="bp" name="bp" value="">
    </div>`;

    const giveCurrencyTemplate = `
  < form >
  <div class="form-group">
    <div class="give-item-dialog player">
      <label>Players:</label>
      <select name="type" id="player">
        ${options.filteredPCList.reduce((acc, currentActor) =>
        {
          return acc + `<option value="${currentActor.id}">${currentActor.name}</option>`
        }, '')}
      </select>
    </div>
    ${getTemplatePerSystem()}
  </div>
    </form > `;

    function getTemplatePerSystem() {
      switch (game.system.id) {
        case "dnd5e":
          return currencyDnD5ETemplate;
        case "pf1":
        case "pf2e":
          return currencyPFTemplate;
        case "wfrp4e":
          return currencyWFRP4ETemplate;
      
        default:
          return currencyDnD5ETemplate;
      }
    }
    
    let applyChanges = false;
    super({
      title: !options.currency ? "Offer item to someone" : "Offer currency to someone",
      content: options.currency ? giveCurrencyTemplate : giveItemTemplate,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: options.acceptLabel ? options.acceptLabel : "Accept",
          callback: () => applyChanges = true
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: "Cancel"
        },
      },
      default: "yes",
      close: () => {
        if (applyChanges) {
          if (options.currency) {
            const playerId = document.getElementById('player').value;
            if (game.system.id === "wfrp4e") {
              let gc = document.getElementById('gc').value;
              let ss = document.getElementById('ss').value;
              let bp = document.getElementById('bp')?.value;
              if (isNaN(gc) || isNaN(ss) || isNaN(bp)) {
                console.log("Currency quantity invalid");
                return ui.notifications.error(`Currency quantity invalid.`);
              }
              gc = Number(gc);
              ss = Number(ss);
              bp = Number(bp);
              callback({playerId, gc, ss, bp});
            } else {
              let pp = document.getElementById('pp').value;
              let gp = document.getElementById('gp').value;
              let ep = document.getElementById('ep')?.value;
              let sp = document.getElementById('sp').value;
              let cp = document.getElementById('cp').value;
              if (isNaN(pp) || isNaN(gp) || (ep !== undefined && isNaN(ep)) || isNaN(sp) || isNaN(cp)) {
                console.log("Currency quantity invalid");
                return ui.notifications.error(`Currency quantity invalid.`);
              }
              pp = Number(pp);
              gp = Number(gp);
              ep = Number(ep);
              sp = Number(sp);
              cp = Number(cp);
              callback({playerId, pp, gp, ep, sp, cp});
            }
          } else {
            const playerId = document.getElementById('player').value;
            let quantity = document.getElementById('quantity').value;
            if (isNaN(quantity)) {
              console.log("Item quantity invalid");
              return ui.notifications.error(`Item quantity invalid.`);
            }
            quantity = Number(quantity);
            callback({playerId, quantity});
          }
        }
      }
    });
  }
}
