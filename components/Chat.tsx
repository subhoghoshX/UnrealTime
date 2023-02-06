import clsx from "clsx";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import getNow from "../utils/getNow";

interface Props {
  socket: Socket;
}

interface Message {
  text: string;
  senderId: string;
}

export default function Chat({ socket }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    socket.on("chat-message", (message) => {
      setMessages((messages) => [...messages, message]);
    });

    return () => {
      socket.removeAllListeners("chat-message");
    };
  }, []);

  return (
    <div className="h-full p-4">
      <div className="flex h-full w-80 flex-col rounded-md bg-white p-3">
        <ul className="flex-grow space-y-3 overflow-auto p-5">
          {messages.map(({ text, senderId }, i) => (
            <li
              key={i}
              className={clsx("flex flex-col", {
                "items-end": socket.id === senderId,
                "items-start": socket.id !== senderId,
              })}
            >
              <p
                className={clsx("rounded-xl px-3 py-1", {
                  "rounded-bl-none bg-zinc-200": socket.id !== senderId,
                  "rounded-br-none bg-orange-200": socket.id === senderId,
                })}
              >
                {text}
              </p>
              <p className="text-xs text-zinc-700">
                <span className="">Mayank</span>
              </p>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            socket.emit("chat-message", {
              text: messageText,
              senderId: socket.id,
            });
            setMessageText("");
            setMessages((messages) => [
              ...messages,
              { text: messageText, senderId: socket.id },
            ]);
          }}
          className="flex shrink-0 overflow-hidden rounded-lg"
        >
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="h-full rounded-l-lg border border-r-0 px-3 py-1 focus:outline-none"
          />
          <button className="bg-blue-500 px-4 py-2">Send</button>
        </form>
      </div>
    </div>
  );
}
