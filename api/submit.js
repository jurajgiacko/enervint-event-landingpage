export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID } = process.env;

    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
        console.error('Missing Airtable environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const data = req.body;

        const fields = {
            'Název eventu': data.event_name || '',
            'Datum konání': data.event_date || null,
            'Město': data.event_city || '',
            'Disciplína': data.discipline || '',
            'Ročník': data.edition || '',
            'Web': data.website || '',
            'Počet účastníků': data.participants || '',
            'Social reach': data.social_reach || '',
            'Mediální pokrytí': data.media || '',
            'Potřeby': data.needs || '',
            'Prostor pro stánek': data.booth_space || '',
            'Obsluha stánku': data.booth_staff || '',
            'Protiplnění': data.offer || '',
            'Protiplnění jiné': data.offer_other || '',
            'Předchozí spolupráce': data.past_collab || '',
            'Konkurence': data.competitor || '',
            'Detaily spolupráce': data.past_details || '',
            'Kontakt jméno': data.contact_name || '',
            'Email': data.contact_email || '',
            'Telefon': data.contact_phone || '',
            'Organizace': data.organization || '',
            'Adresa': data.delivery_address || '',
            'Poznámky': data.notes || '',
            'Stav': 'Nové',
        };

        // Remove empty optional fields to avoid Airtable validation errors
        Object.keys(fields).forEach(key => {
            if (fields[key] === '' || fields[key] === null) {
                delete fields[key];
            }
        });

        const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

        const response = await fetch(airtableUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                records: [{ fields }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Airtable error:', JSON.stringify(errorData));
            return res.status(response.status).json({ error: 'Failed to save record', details: errorData });
        }

        const result = await response.json();
        return res.status(200).json({ success: true, id: result.records?.[0]?.id });
    } catch (err) {
        console.error('Submit error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
