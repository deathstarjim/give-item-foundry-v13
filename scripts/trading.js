// -- Incoming trade request (shown to the recipient PC) -----------------

export async function receiveTrade(tradeData)
{
    const result = await foundry.applications.api.DialogV2.wait({
        window: { title: 'Incoming Trade Request' },
        content: `<p>${tradeData.currentActor.name} wants to give you ${offerDescription(tradeData)}. Do you accept?</p>`,
        buttons: [
            { action: 'accept', label: 'Accept', icon: 'fas fa-check', default: true },
            { action: 'deny', label: 'Deny', icon: 'fas fa-times' }
        ],
        rejectClose: false
    });

    if (result === 'accept')
    {
        if (tradeData.currentItem) receiveItem(tradeData);
        else receiveCurrency(tradeData);
        sendTradeLog(tradeData);

        // Tell the sender's client to remove the item/currency.
        // Pass only plain data — no live Actor objects in the payload.
        game.socket.emit('module.give-item', {
            data: { currentItem: tradeData.currentItem ?? null, quantity: tradeData.quantity },
            actorId: tradeData.currentActor.id,
            currentActorId: tradeData.actor.id,
            type: 'accepted'
        });
    }
    else
    {
        game.socket.emit('module.give-item', {
            data: {},
            actorId: tradeData.currentActor.id,
            currentActorId: tradeData.actor.id,
            type: 'denied'
        });
    }
}

// -- Called on the sender's client when the recipient accepted -----------

export function completeTrade(tradeData)
{
    if (tradeData.currentItem)
    {
        removeSenderItem(tradeData);
    } else
    {
        removeSenderCurrency(tradeData);
    }
    ui.notifications.info(`${tradeData.currentActor.name} accepted your trade.`);
}

export function denyTrade(tradeData)
{
    ui.notifications.warn(`${tradeData.currentActor.name} declined your trade.`);
}

// -- NPC trade -- executed entirely on the GM's client ------------------

export async function completeNPCTrade({ currentItem, quantity, actor, currentActor })
{
    // actor        = NPC receiving the item/currency
    // currentActor = PC sending the item/currency

    if (currentItem)
    {
        // Remove from sender
        const senderItem = currentActor.items.get(currentItem._id);
        if (senderItem)
        {
            const newQty = (senderItem.system.quantity ?? 0) - quantity;
            if (newQty <= 0)
            {
                await senderItem.delete();
            } else
            {
                await senderItem.update({ 'system.quantity': newQty });
            }
        }
        // Add to NPC
        const itemData = foundry.utils.duplicate(currentItem);
        itemData.system.quantity = quantity;
        await Item.create(itemData, { parent: actor });
    } else
    {
        // Currency -- remove from sender, add to NPC
        await transferCurrencyFrom(currentActor, quantity);
        await transferCurrencyTo(actor, quantity);
    }

    // Notify the sender via a whisper chat message
    const senderUser = game.users.find(u => u.character?.id === currentActor.id);
    const whisperIds = [
        ...game.users.filter(u => u.isGM).map(u => u.id),
        senderUser?.id
    ].filter(Boolean);

    ChatMessage.create({
        content: `${currentActor.name} gave ${offerDescription({ currentItem, quantity })} to ${actor.name}.`,
        whisper: whisperIds
    });

    // Notify the sender's client
    game.socket.emit('module.give-item', {
        data: { actorName: actor.name },
        actorId: currentActor.id,
        currentActorId: actor.id,
        type: 'npc-complete'
    });
}

export function notifyNPCTradeComplete({ currentActor })
{
    ui.notifications.info(`Your gift to ${currentActor.name} was received.`);
}

function receiveItem({ currentItem, quantity, actor })
{
    const itemData = foundry.utils.duplicate(currentItem);
    itemData.system.quantity = quantity;

    const existing = actor.items.find(i => i.name === itemData.name && i.type === itemData.type);
    if (existing)
    {
        existing.update({ 'system.quantity': (existing.system.quantity ?? 0) + quantity });
    } else
    {
        Item.create(itemData, { parent: actor });
    }
}

function receiveCurrency({ actor, quantity })
{
    transferCurrencyTo(actor, quantity);
}

// Remove item from the sender (called on sender's client after acceptance)
function removeSenderItem({ currentItem, quantity, actor })
{
    // When called via completeTrade, actor = sender (actorId was swapped on accept)
    const item = actor.items.get(currentItem._id);
    if (!item) return;
    const newQty = (item.system.quantity ?? 0) - quantity;
    if (newQty <= 0)
    {
        item.delete();
    } else
    {
        item.update({ 'system.quantity': newQty });
    }
}

function removeSenderCurrency({ actor, quantity })
{
    transferCurrencyFrom(actor, quantity);
}

function transferCurrencyTo(actor, quantity)
{
    const cur = actor.system.currency ?? {};
    const update = Object.fromEntries(
        Object.keys(quantity).map(k => [`system.currency.${k}`, (cur[k] ?? 0) + (quantity[k] ?? 0)])
    );
    return actor.update(update);
}

function transferCurrencyFrom(actor, quantity)
{
    const cur = actor.system.currency ?? {};
    const update = Object.fromEntries(
        Object.keys(quantity).map(k => [`system.currency.${k}`, (cur[k] ?? 0) - (quantity[k] ?? 0)])
    );
    return actor.update(update);
}

function offerDescription({ currentItem, quantity })
{
    if (currentItem)
    {
        return `${quantity}x ${currentItem.name}`;
    }
    const parts = [];
    if (quantity.pp) parts.push(`${quantity.pp} pp`);
    if (quantity.gp) parts.push(`${quantity.gp} gp`);
    if (quantity.ep) parts.push(`${quantity.ep} ep`);
    if (quantity.sp) parts.push(`${quantity.sp} sp`);
    if (quantity.cp) parts.push(`${quantity.cp} cp`);
    return parts.join(', ') || '(nothing)';
}

function sendTradeLog(tradeData)
{
    const senderUser = game.users.find(u => u.character?.id === tradeData.currentActor.id);
    const whisperIds = [
        ...game.users.filter(u => u.isGM).map(u => u.id),
        senderUser?.id
    ].filter(Boolean);

    ChatMessage.create({
        content: `${tradeData.currentActor.name} gave ${offerDescription(tradeData)} to ${tradeData.actor.name}.`,
        whisper: whisperIds,
        speaker: ChatMessage.getSpeaker({ actor: tradeData.actor })
    });
}