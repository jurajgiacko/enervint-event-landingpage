export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID, ADMIN_PIN } = process.env;

    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const { pin, recordId, fields } = req.body;

    if (ADMIN_PIN && pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!recordId || !fields) {
        return res.status(400).json({ error: 'Missing recordId or fields' });
    }

    const allowedFields = ['Stav', 'Tier', 'Score', 'Poznamky'];
    const sanitized = {};
    for (const [key, value] of Object.entries(fields)) {
        if (allowedFields.includes(key)) {
            sanitized[key] = value;
        }
    }

    if (Object.keys(sanitized).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: sanitized }),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Airtable update error:', JSON.stringify(err));
            return res.status(response.status).json({ error: 'Airtable error', details: err });
        }

        const result = await response.json();
        return res.status(200).json({ success: true, record: result });
    } catch (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
