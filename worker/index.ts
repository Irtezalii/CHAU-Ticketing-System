export interface Env {
  ticketing_db: D1Database;
}

interface TicketRequestBody {
  ticketRef?: string;
  name?: string;
  email?: string;
  subject?: string;
  requestType?: string;
  priority?: string;
  mainDescription?: string;
  expectedBehavior?: string;
  impact?: string;
  phone?: string;
  leadPhone?: string;
  platformArea?: string;
  workspaceKind?: string;
  workspaceName?: string;
  workspaceUse?: string;
  neededBy?: string;
  campaignName?: string;
  campaignGoal?: string;
  goLiveDate?: string;
  otherTimeframe?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET /api/tickets - Fetch all tickets ordered by creation date
    if (request.method === 'GET' && url.pathname === '/api/tickets') {
      try {
        const { results } = await env.ticketing_db
          .prepare('SELECT * FROM tickets ORDER BY id DESC')
          .all();

        return Response.json({ success: true, tickets: results });
      } catch (error) {
        return Response.json(
          {
            success: false,
            message: 'Failed to fetch tickets from database',
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    // POST /api/tickets - Submit a new ticket
    if (request.method === 'POST' && url.pathname === '/api/tickets') {
      try {
        const body = (await request.json()) as TicketRequestBody;

        const name = body.name?.trim();
        const email = body.email?.trim();
        const subject = body.subject?.trim();
        const requestType = body.requestType?.trim();
        const priority = body.priority?.trim() || 'Medium';
        const mainDescription = body.mainDescription?.trim();
        const ticketRef = body.ticketRef?.trim() || `TK-${Math.floor(1000 + Math.random() * 9000)}`;

        if (!name || !email || !subject || !requestType || !mainDescription) {
          return Response.json(
            { success: false, message: 'Missing required ticket fields' },
            { status: 400 }
          );
        }

        const descriptionSummary = `[${requestType.toUpperCase()}] ${mainDescription}`;

        const query = `
          INSERT INTO tickets (
            ticket_ref,
            name,
            email,
            subject,
            request_type,
            priority,
            description,
            main_description,
            expected_behavior,
            impact,
            callback_phone,
            lead_phone,
            platform_area,
            workspace_kind,
            workspace_name,
            workspace_use,
            needed_by,
            campaign_name,
            campaign_goal,
            go_live_date,
            timeframe,
            status
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN'
          )
          RETURNING *;
        `;

        const insertedTicket = await env.ticketing_db
          .prepare(query)
          .bind(
            ticketRef,
            name,
            email,
            subject,
            requestType,
            priority,
            descriptionSummary,
            mainDescription,
            body.expectedBehavior || null,
            body.impact || null,
            body.phone || null,
            body.leadPhone || null,
            body.platformArea || null,
            body.workspaceKind || null,
            body.workspaceName || null,
            body.workspaceUse || null,
            body.neededBy || null,
            body.campaignName || null,
            body.campaignGoal || null,
            body.goLiveDate || null,
            body.otherTimeframe || null
          )
          .first();

        return Response.json(
          {
            success: true,
            message: 'Ticket persisted successfully',
            ticket: insertedTicket,
          },
          { status: 201 }
        );
      } catch (error) {
        return Response.json(
          {
            success: false,
            message: 'Database error saving ticket',
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
