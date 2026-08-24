type TicketRequest = {
  name: string;
  email: string;
  subject: string;
  requestType: string;
  priority: string;
  description: string;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/tickets" && request.method === "POST") {
      try {
        const ticket = (await request.json()) as TicketRequest;

        const {
          name,
          email,
          subject,
          requestType,
          priority,
          description,
        } = ticket;

        const result = await env.ticketing_db
          .prepare(`
            INSERT INTO tickets (
              name,
              email,
              subject,
              request_type,
              priority,
              description
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `)
          .bind(
            name,
            email,
            subject,
            requestType,
            priority,
            description
          )
          .run();

        return Response.json({
          success: true,
          message: "Ticket created successfully",
          ticketId: result.meta.last_row_id,
        });
      } catch (error) {
        console.error("Ticket creation error:", error);

        return Response.json(
          {
            success: false,
            message: "Failed to create ticket",
          },
          { status: 500 }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
