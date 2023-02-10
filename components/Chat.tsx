import clsx from "clsx";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import getNow from "../utils/getNow";
import { HiPaperAirplane } from "react-icons/hi2";

interface Props {
  socket: Socket;
  userName: string;
}

interface Message {
  text: string;
  senderId: string;
  username: string;
}

export default function Chat({ socket, userName }: Props) {
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
      <div className="flex h-full w-80 flex-col rounded-md bg-white px-1 pt-2">
        <ul className="thin-scroll flex-grow space-y-3 overflow-y-scroll p-2">
          {messages.map(({ text, senderId, username }, i) => (
            <li
              key={i}
              className={clsx("flex flex-col", {
                "items-end": socket.id === senderId,
                "items-start": socket.id !== senderId,
              })}
            >
              <p
                className={clsx("rounded-xl px-3 py-1.5", {
                  "rounded-bl-none bg-zinc-200": socket.id !== senderId,
                  "rounded-br-none bg-orange-200": socket.id === senderId,
                })}
              >
                {text}
              </p>
              <p className="text-xs text-zinc-700">
                <span className="">{username}</span>
              </p>
            </li>
          ))}
        </ul>
        <section className="px-1 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              socket.emit("chat-message", {
                text: messageText,
                senderId: socket.id,
                username: userName,
              });
              setMessageText("");
              setMessages((messages) => [
                ...messages,
                { text: messageText, senderId: socket.id, username: userName },
              ]);
            }}
            className="relative shrink-0"
          >
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-full border border-zinc-300 py-2.5 pl-4 pr-14 focus:outline-none"
            />
            <button className="absolute inset-y-1.5 right-2 rounded-full bg-blue-500 py-2 px-3 text-white hover:bg-blue-600">
              <HiPaperAirplane />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
