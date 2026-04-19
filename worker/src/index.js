export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ ok: true });
      }

      if (url.pathname === '/api/activities' && request.method === 'GET') {
        const rows = await env.DB
          .prepare(`
            SELECT id, title, description, author, votes, created_at AS createdAt
            FROM activities
            ORDER BY votes DESC, created_at DESC
          `)
          .all();

        return json({ activities: rows.results || [] });
      }

      if (url.pathname === '/api/activities' && request.method === 'POST') {
        const payload = await request.json();
        const title = String(payload.title || '').trim();
        const description = String(payload.description || '').trim();
        const author = String(payload.author || '').trim();

        if (!title) {
          return json({ error: 'Title is required.' }, 400);
        }

        await env.DB
          .prepare(`
            INSERT INTO activities (title, description, author, votes)
            VALUES (?1, ?2, ?3, 0)
          `)
          .bind(title, description || null, author || null)
          .run();

        return json({ ok: true }, 201);
      }

      const voteMatch = url.pathname.match(/^\/api\/activities\/(\d+)\/vote$/);
      if (voteMatch && request.method === 'POST') {
        const activityId = Number(voteMatch[1]);

        await env.DB
          .prepare(`
            UPDATE activities
            SET votes = votes + 1
            WHERE id = ?1
          `)
          .bind(activityId)
          .run();

        return json({ ok: true });
      }

      const commentsMatch = url.pathname.match(/^\/api\/activities\/(\d+)\/comments$/);
      if (commentsMatch && request.method === 'GET') {
        const activityId = Number(commentsMatch[1]);
        const rows = await env.DB
          .prepare(`
            SELECT id, activity_id AS activityId, author, body, created_at AS createdAt
            FROM comments
            WHERE activity_id = ?1
            ORDER BY created_at ASC
          `)
          .bind(activityId)
          .all();

        return json({ comments: rows.results || [] });
      }

      if (commentsMatch && request.method === 'POST') {
        const activityId = Number(commentsMatch[1]);
        const payload = await request.json();
        const body = String(payload.body || '').trim();
        const author = String(payload.author || '').trim();

        if (!body) {
          return json({ error: 'Comment body is required.' }, 400);
        }

        await env.DB
          .prepare(`
            INSERT INTO comments (activity_id, author, body)
            VALUES (?1, ?2, ?3)
          `)
          .bind(activityId, author || null, body)
          .run();

        return json({ ok: true }, 201);
      }

      if (url.pathname === '/api/timeline-entries' && request.method === 'GET') {
        const rows = await env.DB
          .prepare(`
            SELECT t.id, t.activity_id AS activityId, t.day, t.start_time AS startTime,
                   t.end_time AS endTime, t.author, t.created_at AS createdAt, a.title
            FROM timeline_entries t
            JOIN activities a ON a.id = t.activity_id
            ORDER BY t.day ASC, t.start_time ASC
          `)
          .all();

        return json({ entries: rows.results || [] });
      }

      if (url.pathname === '/api/timeline-entries' && request.method === 'POST') {
        const payload = await request.json();
        const activityId = Number(payload.activityId);
        const day = String(payload.day || '').trim();
        const startTime = String(payload.startTime || '').trim();
        const endTime = String(payload.endTime || '').trim();
        const author = String(payload.author || '').trim();

        if (!activityId || !day || !startTime || !endTime) {
          return json({ error: 'activityId, day, startTime, and endTime are required.' }, 400);
        }

        if (endTime <= startTime) {
          return json({ error: 'endTime must be after startTime.' }, 400);
        }

        await env.DB
          .prepare(`
            INSERT INTO timeline_entries (activity_id, day, start_time, end_time, author)
            VALUES (?1, ?2, ?3, ?4, ?5)
          `)
          .bind(activityId, day, startTime, endTime, author || null)
          .run();

        return json({ ok: true }, 201);
      }

      if (url.pathname === '/api/timeline/master' && request.method === 'GET') {
        const rows = await env.DB
          .prepare(`
            SELECT a.title,
                   t.day,
                   t.start_time AS startTime,
                   t.end_time AS endTime,
                   COUNT(*) AS totalVotes
            FROM timeline_entries t
            JOIN activities a ON a.id = t.activity_id
            GROUP BY t.activity_id, t.day, t.start_time, t.end_time
            ORDER BY t.day ASC, t.start_time ASC, totalVotes DESC
          `)
          .all();

        return json({ rows: rows.results || [] });
      }

      return json({ error: 'Not found' }, 404);
    } catch (error) {
      return json({ error: `Server error: ${error.message}` }, 500);
    }
  }
};

function json(payload, status = 200) {
  return withCors(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  );
}

function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}
