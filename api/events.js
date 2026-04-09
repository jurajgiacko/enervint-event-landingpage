export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID, ADMIN_PIN } = process.env;

    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const pin = req.query.pin;
    if (ADMIN_PIN && pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const allRecords = [];
        let offset = null;

        do {
            const params = new URLSearchParams();
            if (offset) params.set('offset', offset);

            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?${params}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` },
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('Airtable error:', JSON.stringify(err));
                return res.status(response.status).json({ error: 'Airtable error', details: err });
            }

            const data = await response.json();
            allRecords.push(...data.records);
            offset = data.offset || null;
        } while (offset);

        return res.status(200).json({ records: allRecords });
    } catch (err) {
        console.error('Events fetch error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
