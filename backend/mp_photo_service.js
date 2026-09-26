const MEMBERS_BASE_URL = 'https://www.ourcommons.ca/Members/en';
const OFFICIAL_PHOTO_PATTERN = /(?:src|data-src)=["']([^"']*\/Content\/Parliamentarians\/Images\/OfficialMPPhotos\/[^"']+)["']/i;

class MpPhotoError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

function makeProfileSlug(firstName, lastName) {
    return `${firstName} ${lastName}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

async function getCurrentMpForRiding(pool, ridingName) {
    const { rows } = await pool.query(`
        SELECT mps_by_parliament
        FROM capitoll_v2.ridings
        WHERE name = $1
    `, [ridingName]);

    if (rows.length === 0) {
        throw new MpPhotoError(404, 'Riding not found');
    }

    const row = rows[0];
    const history = row.mps_by_parliament || {};
    const parliamentNumber = Object.keys(history)
        .map(Number)
        .filter(Number.isInteger)
        .sort((left, right) => right - left)[0];
    const entries = history[String(parliamentNumber)];
    const currentEntry = Array.isArray(entries)
        ? [...entries].sort((left, right) =>
            Number(right.sessionNumber) - Number(left.sessionNumber)
        )[0]
        : null;
    const sessionNumber = Number(currentEntry?.sessionNumber);

    if (!currentEntry?.personId) {
        throw new MpPhotoError(404, 'No MP is recorded for this riding in the current session');
    }

    return {
        personId: String(currentEntry.personId),
        parliamentNumber,
        sessionNumber
    };
}

async function getMpOfficialPhoto(pool, ridingName, fetchImpl = fetch) {
    if (typeof ridingName !== 'string' || !ridingName.trim()) {
        throw new MpPhotoError(400, 'riding_name is required');
    }

    const normalizedRidingName = ridingName.trim();
    const mp = await getCurrentMpForRiding(pool, normalizedRidingName);
    const xmlResponse = await fetchImpl(`${MEMBERS_BASE_URL}/${mp.personId}/xml`, {
        headers: { Accept: 'application/xml, text/xml' }
    });

    if (!xmlResponse.ok) {
        throw new MpPhotoError(502, 'Could not load the MP profile XML');
    }

    const profileXml = await xmlResponse.text();
    const { rows } = await pool.query(`
        SELECT
            (xpath('string(/Profile/MemberOfParliamentRole/PersonOfficialFirstName)',
                XMLPARSE(DOCUMENT $1)))[1]::text AS first_name,
            (xpath('string(/Profile/MemberOfParliamentRole/PersonOfficialLastName)',
                XMLPARSE(DOCUMENT $1)))[1]::text AS last_name
    `, [profileXml]);
    const firstName = rows[0]?.first_name?.trim();
    const lastName = rows[0]?.last_name?.trim();

    if (!firstName || !lastName) {
        throw new MpPhotoError(404, 'MP name was not present in the profile XML');
    }

    const profileUrl =
        `${MEMBERS_BASE_URL}/${makeProfileSlug(firstName, lastName)}(${mp.personId})`;
    const profileResponse = await fetchImpl(profileUrl, {
        headers: { Accept: 'text/html' }
    });

    if (!profileResponse.ok) {
        throw new MpPhotoError(502, 'Could not load the MP profile page');
    }

    const profileHtml = await profileResponse.text();
    const imageMatch = profileHtml.match(OFFICIAL_PHOTO_PATTERN);
    if (!imageMatch) {
        throw new MpPhotoError(404, 'Official MP photo was not found');
    }

    return {
        riding_name: normalizedRidingName,
        person_id: mp.personId,
        photo_url: new URL(imageMatch[1].replace(/&amp;/g, '&'), profileUrl).toString()
    };
}

module.exports = { MpPhotoError, getMpOfficialPhoto, makeProfileSlug };
