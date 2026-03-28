export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  const { title, content, imageUrl, date } = body;

  await env.DB.prepare(
    `INSERT INTO posts (title, content, imageUrl, date, createdAt)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(title, content, imageUrl, date, new Date().toISOString())
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestGet(context) {
  const { env } = context;

  const { results } = await env.DB.prepare(
    `SELECT * FROM posts ORDER BY id DESC`
  ).all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}
