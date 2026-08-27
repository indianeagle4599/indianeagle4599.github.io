const MAX_BODY_BYTES = 8192;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const COUNTRY_MAX = 8;
const PHONE_MAX = 32;
const MESSAGE_MAX = 4000;
const TOKEN_MAX = 4096;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_RE = /^\+\d{1,4}$/;
const PHONE_LOCAL_RE = /^[0-9 ()\-.]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

const idempotencyHits = new Map();

function logOp(event, status, extra) {
    const entry = { event, status };
    if (extra && extra.error) entry.error = extra.error;
    if (extra && extra.id) entry.id = extra.id;
    console.log(entry);
}

function json(status, body, origin, event, id) {
    logOp(event || 'response', status, {
        error: body && body.error ? body.error : undefined,
        id
    });
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            ...corsHeaders(origin)
        }
    });
}

function corsHeaders(origin) {
    if (!origin) return {};
    return {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, idempotency-key',
        'access-control-max-age': '86400',
        vary: 'Origin'
    };
}

function allowedOrigins(env) {
    const raw = String(env.ALLOWED_ORIGINS || 'https://hiteshgoyal.me');
    return raw.split(',').map(item => item.trim()).filter(Boolean);
}

function originOf(request, env) {
    const origin = request.headers.get('origin') || '';
    return allowedOrigins(env).includes(origin) ? origin : '';
}

function pruneMap(map, now, ttl) {
    if (map.size < 64) return;
    for (const [key, value] of map) {
        if (value + ttl < now) map.delete(key);
    }
}

async function overLimit(env, ip) {
    if (!env.CONTACT_LIMITER || typeof env.CONTACT_LIMITER.limit !== 'function') return true;
    const { success } = await env.CONTACT_LIMITER.limit({ key: ip || 'unknown' });
    return !success;
}

function isReplay(key, now) {
    pruneMap(idempotencyHits, now, IDEMPOTENCY_TTL_MS);
    const previous = idempotencyHits.get(key);
    return Boolean(previous && previous + IDEMPOTENCY_TTL_MS > now);
}

function asString(value, max) {
    if (value == null) return '';
    if (typeof value !== 'string') return null;
    return value.length > max ? null : value;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function emptyCountry(raw) {
    const value = String(raw || '').trim();
    return !value || value === '+';
}

function phonePairOk(countryRaw, numberRaw) {
    const country = String(countryRaw || '').trim();
    const number = String(numberRaw || '').trim();
    const countryEmpty = emptyCountry(country);
    const numberEmpty = !number;
    if (countryEmpty && numberEmpty) return true;
    if (countryEmpty !== numberEmpty) return false;
    if (!COUNTRY_RE.test(country)) return false;
    if (!PHONE_LOCAL_RE.test(number)) return false;
    const local = number.replace(/[ ()\-.]/g, '');
    const total = country.length - 1 + local.length;
    return total >= 7 && total <= 15;
}

export function fieldsOk(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const name = asString(payload.name, NAME_MAX);
    const email = asString(payload.email, EMAIL_MAX);
    const countryRaw = asString(payload.country, COUNTRY_MAX);
    const phone = asString(payload.phone, PHONE_MAX);
    const message = asString(payload.message, MESSAGE_MAX);
    const website = asString(payload.website, NAME_MAX);
    const turnstileToken = asString(payload.turnstileToken, TOKEN_MAX);
    if ([name, email, countryRaw, phone, message, website, turnstileToken].some(value => value === null)) return null;
    const country = emptyCountry(countryRaw) ? '' : String(countryRaw).trim();
    if (!name.trim() || !email.trim() || !message.trim()) return null;
    if (!EMAIL_RE.test(email.trim())) return null;
    if (!phonePairOk(countryRaw, phone)) return null;
    return {
        name: name.trim(),
        email: email.trim(),
        country,
        phone: phone.trim().replace(/\s+/g, ''),
        message: message.trim(),
        website: website.trim(),
        turnstileToken: turnstileToken.trim()
    };
}

async function verifyTurnstile(token, ip, secret) {
    const body = new URLSearchParams({
        secret,
        response: token
    });
    if (ip) body.set('remoteip', ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body
    });
    if (!response.ok) return false;
    const result = await response.json();
    return Boolean(result && result.success);
}

function mailBodies(fields) {
    const phoneLine = fields.country && fields.phone ? `${fields.country}${fields.phone}` : 'omitted';
    const text = `Name: ${fields.name}\nEmail: ${fields.email}\nPhone: ${phoneLine}\n\nMessage:\n${fields.message}\n`;
    const html = `<p><strong>Name:</strong> ${escapeHtml(fields.name)}</p>
<p><strong>Email:</strong> ${escapeHtml(fields.email)}</p>
<p><strong>Phone:</strong> ${escapeHtml(phoneLine)}</p>
<p><strong>Message:</strong></p>
<p>${escapeHtml(fields.message).replace(/\n/g, '<br>')}</p>`;
    return { text, html };
}

async function sendResend(env, fields, idempotencyKey) {
    if (String(env.STUB_RESEND || '') === '1') return true; // local/dev only; no inbox delivery
    const { text, html } = mailBodies(fields);
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            authorization: `Bearer ${env.RESEND_API_KEY}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey
        },
        body: JSON.stringify({
            from: 'Hitesh Goyal Portfolio <website@contact.hiteshgoyal.me>',
            to: [env.CONTACT_TO_EMAIL],
            reply_to: fields.email,
            subject: `Portfolio contact: ${fields.name.slice(0, 80)}`,
            text,
            html
        })
    });
    if (response.ok || response.status === 409) return true;
    return false;
}

export default {
    async fetch(request, env) {
        const origin = originOf(request, env);
        if (request.method === 'OPTIONS') {
            if (!origin) {
                logOp('cors_reject', 403);
                return new Response(null, { status: 403 });
            }
            logOp('options', 204);
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }
        if (!origin) return json(403, { ok: false, error: 'invalid' }, '', 'cors_reject');
        if (request.method !== 'POST') return json(405, { ok: false, error: 'invalid' }, origin, 'method_reject');
        const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
        if (path !== '/' && path !== '/contact') return json(404, { ok: false, error: 'invalid' }, origin, 'path_reject');
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            return json(415, { ok: false, error: 'invalid' }, origin, 'content_type');
        }

        const length = Number(request.headers.get('content-length') || 0);
        if (length > MAX_BODY_BYTES) return json(400, { ok: false, error: 'invalid' }, origin, 'oversize');

        let payload;
        try {
            const buffer = await request.arrayBuffer();
            if (buffer.byteLength > MAX_BODY_BYTES) return json(400, { ok: false, error: 'invalid' }, origin, 'oversize');
            payload = JSON.parse(new TextDecoder().decode(buffer));
        } catch {
            return json(400, { ok: false, error: 'invalid' }, origin, 'parse');
        }

        const fields = fieldsOk(payload);
        if (!fields) return json(400, { ok: false, error: 'invalid' }, origin, 'invalid');
        if (fields.website) return json(200, { ok: true }, origin, 'honeypot');

        const idempotencyKey = String(request.headers.get('idempotency-key') || '').trim();
        if (!UUID_RE.test(idempotencyKey)) return json(400, { ok: false, error: 'invalid' }, origin, 'invalid');

        const ip = request.headers.get('CF-Connecting-IP') || '';
        const now = Date.now();
        if (isReplay(idempotencyKey, now)) return json(200, { ok: true }, origin, 'replay', idempotencyKey);
        try {
            if (await overLimit(env, ip)) return json(429, { ok: false, error: 'unavailable' }, origin, 'rate_limit', idempotencyKey);
        } catch {
            return json(502, { ok: false, error: 'unavailable' }, origin, 'rate_limit_error', idempotencyKey);
        }

        if (!fields.turnstileToken) return json(403, { ok: false, error: 'unverified' }, origin, 'unverified', idempotencyKey);
        if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) {
            return json(502, { ok: false, error: 'unavailable' }, origin, 'misconfigured', idempotencyKey);
        }

        let verified = false;
        try {
            verified = await verifyTurnstile(fields.turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
        } catch {
            return json(502, { ok: false, error: 'unavailable' }, origin, 'turnstile_error', idempotencyKey);
        }
        if (!verified) return json(403, { ok: false, error: 'unverified' }, origin, 'turnstile_fail', idempotencyKey);

        let sent = false;
        try {
            sent = await sendResend(env, fields, idempotencyKey);
        } catch {
            return json(502, { ok: false, error: 'unavailable' }, origin, 'resend_error', idempotencyKey);
        }
        if (!sent) return json(502, { ok: false, error: 'unavailable' }, origin, 'resend_fail', idempotencyKey);
        idempotencyHits.set(idempotencyKey, now);
        return json(200, { ok: true }, origin, 'sent', idempotencyKey);
    }
};
