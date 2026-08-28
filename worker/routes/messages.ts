import type { Env, MessageRequestBody } from '../types';

// ----------------------------------------------------
// GET /api/tickets/:ticketRef/messages (PUBLIC)
// ----------------------------------------------------
export async function handleGetMessages(
  ticketRef: string,
  env: Env
): Promise<Response> {
  try {
    const { results } = await env.ticketing_db
      .prepare(
        'SELECT * FROM ticket_messages WHERE ticket_ref = ? ORDER BY id ASC'
      )
      .bind(ticketRef)
      .all();

    return Response.json({ success: true, messages: results });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'Failed to fetch messages',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------
// POST /api/tickets/:ticketRef/messages (PUBLIC)
// ----------------------------------------------------
export async function handleSendMessage(
  ticketRef: string,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as MessageRequestBody;
    const senderName = body.senderName?.trim() || 'Anonymous';
    const senderRole = body.senderRole || 'user';
    const message = body.message?.trim();

    if (!message) {
      return Response.json(
        { success: false, message: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO ticket_messages (ticket_ref, sender_name, sender_role, message)
      VALUES (?, ?, ?, ?)
      RETURNING *;
    `;

    const insertedMessage = await env.ticketing_db
      .prepare(query)
      .bind(ticketRef, senderName, senderRole, message)
      .first();

    return Response.json(
      { success: true, message: 'Message sent', data: insertedMessage },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'Database error saving message',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

