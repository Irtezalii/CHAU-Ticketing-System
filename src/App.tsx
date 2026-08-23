import { useState } from "react";

function App() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [requestType, setRequestType] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");

  const handleSubmit = async (
  event: React.FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();

  const ticket = {
    name,
    email,
    subject,
    requestType,
    priority,
    description,
  };

  const response = await fetch("/api/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ticket),
  });

  const data = await response.json();

  console.log(data);
};

  return (
    <main>
      <h1>Ticketing System</h1>
      <p>Submit a support ticket</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="subject">Subject</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="What do you need help with?"
          />
        </div>

        <div>
          <label htmlFor="requestType">Request Type</label>
          <select
            id="requestType"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
          >
            <option value="">Select request type</option>
            <option value="Technical Support">Technical Support</option>
            <option value="Billing">Billing</option>
            <option value="General Inquiry">General Inquiry</option>
            <option value="Bug Report">Bug Report</option>
          </select>
        </div>

        <div>
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe your issue..."
            rows={6}
          />
        </div>

        <button type="submit">Submit Ticket</button>
      </form>
    </main>
  );
}

export default App;
