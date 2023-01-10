import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

interface Props {
  socket: Socket;
}

export default function Chat({ socket }: Props) {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    socket.on("chat-message", (arg) => {
      setMessages((messages) => [...messages, arg]);
    });

    return () => {
      socket.removeAllListeners("chat-message");
    };
  }, []);

  return (
    <div className="flex flex-col border-l border-black">
      <ul className="flex-grow overflow-auto p-5">
        {messages.map((message, i) => (
          <li key={i}>{message}</li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          socket.emit("chat-message", message);
          setMessage("");
          setMessages((messages) => [...messages, message]);
        }}
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border"
        />
        <button className="bg-blue-500 px-4 py-2">Send</button>
      </form>
    </div>
  );
}
