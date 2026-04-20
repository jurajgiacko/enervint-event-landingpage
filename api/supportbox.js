export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { SUPPORTBOX_TOKEN, ADMIN_PIN } = process.env;

    if (!SUPPORTBOX_TOKEN) {
        return res.status(500).json({ error: 'SupportBox not configured' });
    }

    const pin = req.query.pin;
    if (ADMIN_PIN && pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ error: 'Missing email parameter' });
    }

    const SB_BASE = 'https://app.supportbox.cz/api/rest/v2';
    const headers = { 'Authorization': `Bearer ${SUPPORTBOX_TOKEN}` };

    try {
        const params = new URLSearchParams({
            'filter[sender_email][eq]': email,
            'per_page': '50'
        });
        const ticketsRes = await fetch(`${SB_BASE}/mail-tickets?${params}`, { headers });
        if (!ticketsRes.ok) {
            const err = await ticketsRes.text();
            console.error('SupportBox tickets error:', err);
            return res.status(ticketsRes.status).json({ error: 'SupportBox error' });
        }
        const ticketsData = await ticketsRes.json();
        const inboundTickets = ticketsData.items || [];

        const outParams = new URLSearchParams({
            'filter[sender_email][eq]': 'team@vitarsport.cz',
            'per_page': '50'
        });
        const outRes = await fetch(`${SB_BASE}/mail-messages?${outParams}`, { headers });
        let outMessages = [];
        if (outRes.ok) {
            const outData = await outRes.json();
            outMessages = (outData.items || []).filter(m =>
                m.to && m.to.toLowerCase().includes(email.toLowerCase())
            );
        }

        const allTicketIds = new Set([
            ...inboundTickets.map(t => t.id),
            ...outMessages.map(m => m.ticket?.id).filter(Boolean)
        ]);

        const conversations = [];
        for (const tid of allTicketIds) {
            const msgRes = await fetch(`${SB_BASE}/mail-tickets/${tid}/messages?per_page=50`, { headers });
            if (!msgRes.ok) continue;
            const msgData = await msgRes.json();
            const messages = msgData.items || [];
            if (messages.length === 0) continue;

            const hasOurReply = messages.some(m => m.type?.startsWith('out'));
            const hasTheirReply = messages.some(m => m.type === 'in' || m.type === 'in_3rd');
            const lastMsg = messages[0];

            conversations.push({
                ticketId: tid,
                subject: lastMsg.subject || '',
                messageCount: msgData.pagination?.total || messages.length,
                lastMessageAt: lastMsg.created_at,
                lastMessageType: lastMsg.type,
                lastMessageFrom: lastMsg.from,
                hasOurReply,
                hasTheirReply,
                status: inboundTickets.find(t => t.id === tid)?.status || 'unknown'
            });
        }

        conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

        const replied = conversations.some(c => c.hasTheirReply);
        const totalMessages = conversations.reduce((s, c) => s + c.messageCount, 0);

        return res.status(200).json({
            email,
            ticketCount: conversations.length,
            totalMessages,
            replied,
            conversations
        });
    } catch (err) {
        console.error('SupportBox error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
