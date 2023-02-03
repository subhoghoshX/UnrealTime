import Head from "next/head";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Chat from "../components/Chat";
import negotiate from "../utils/negotiate";
import {
  BsCameraVideo,
  BsCameraVideoOff,
  BsMic,
  BsMicMute,
} from "react-icons/bs";
import { MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import MediaButton from "../components/Button/MediaButton";
import Video from "../components/Video";

const socket = io({
  autoConnect: false,
});

type ConnectionDetail = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  senders: {
    video: RTCRtpSender | null;
    audio: RTCRtpSender | null;
    screenShare: RTCRtpSender | null;
  };
  userId: string;
};

export default function Home() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [users, setUsers] = useState<Record<string, ConnectionDetail>>({});

  // set socket it & populate user object
  useEffect(() => {
    socket.on("new-user-list", (userList: string[]) => {
      console.log("new-user-list", userList);
      // only a variable is enough
      const socketId = socket.id;
      setUsers((oldUsers) => {
        const usersObj = { ...oldUsers }; // take copy of users instead of getting it's ref as setState would think it's the same object & nothing changed
        userList.forEach((user) => {
          if (!usersObj[user] && user !== socketId) {
            const pc = new RTCPeerConnection({
              iceServers: [
                {
                  urls: ["stun:stun1.l.google.com:19302"],
                },
              ],
            });

            pc.ontrack = (event) => {
              const stream = usersObj[user].stream;
              stream.getTracks().forEach((track) => {
                stream.removeTrack(track);
              });
              event.streams[0].getTracks().forEach((track) => {
                stream.addTrack(track);
              });
              console.log(stream.getTracks());
            };

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("new-ice-candidate", {
                  senderId: socketId,
                  receiverId: user,
                  candidate: event.candidate.toJSON(),
                });
              }
            };

            pc.onnegotiationneeded = () => {
              negotiate(pc, socket, socketId, user);
            };

            usersObj[user] = {
              pc,
              stream: new MediaStream(),
              senders: {
                audio: null,
                video: null,
                screenShare: null,
              },
              userId: user,
            };
          }
        });

        Object.keys(usersObj).forEach((id) => {
          if (userList.indexOf(id) < 0) {
            usersObj[id].pc.close();
            delete usersObj[id];
          }
        });

        return usersObj;
      });
    });

    //attach other socket listeners
    socket.on("offer-event", async ({ offer, senderId }) => {
      // only a variable is enough
      const socketId = socket.id;

      await users[senderId].pc.setRemoteDescription(
        new RTCSessionDescription(offer),
      );

      if (offer.type === "offer") {
        await users[senderId].pc.setRemoteDescription(
          new RTCSessionDescription(offer),
        );

        console.log("receive offer => ", offer);
        const answer = await users[senderId].pc.createAnswer();
        await users[senderId].pc.setLocalDescription(answer);

        socket.emit("offer-event", {
          offer: answer,
          senderId: socketId,
          receiverId: senderId,
        });
        console.log("send answer => ", answer);
      }

      if (offer.type === "answer") {
        console.log("received answer => ", offer);
      }
    });

    socket.on("new-ice-candidate", ({ senderId, candidate, receiverId }) => {
      users[senderId].pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.connect();

    socket.on("connect", () => {
      console.log("Connected!! My ID is = ", socket.id);
    });

    return () => {
      socket.removeAllListeners("new-user-list");
      socket.removeAllListeners("offer-event");
      socket.removeAllListeners("new-ice-candidate");
      socket.removeAllListeners("connect");
    };
  }, [users]);

  // initialize localStream
  useEffect(() => {
    if (!localStream) {
      setLocalStream(new MediaStream());
    }
  }, []);

  async function getCamera() {
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    videoStream.getTracks().forEach((track) => {
      localStream?.addTrack(track);

      Object.values(users).forEach((user) => {
        const sender = user.pc.addTrack(track, localStream!);
        user.senders.video = sender;
      });
    });
  }

  useEffect(() => {
    if (videoEnabled) {
      getCamera();
    } else {
      Object.values(users).forEach((user) => {
        if (user.senders.video) {
          user.pc.removeTrack(user.senders.video);
        }
      });
    }
  }, [videoEnabled]);

  async function getAudio() {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    audioStream.getTracks().forEach((track) => {
      localStream?.addTrack(track); // maybe not necessary, as it'll be muted anyway

      Object.values(users).forEach((user) => {
        const sender = user.pc.addTrack(track, localStream!);
        user.senders.audio = sender;
      });
    });
  }

  useEffect(() => {
    if (audioEnabled) {
      getAudio();
    } else {
      Object.values(users).forEach((user) => {
        if (user.senders.audio) {
          user.pc.removeTrack(user.senders.audio);
        }
      });
    }
  }, [audioEnabled]);

  async function shareScreen() {
    const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    screenCaptureStream.getTracks().forEach((track) => {
      localStream?.addTrack(track);

      Object.values(users).forEach((user) => {
        const sender = user.pc.addTrack(track, localStream!);
        user.senders.screenShare = sender;
      });
    });
  }

  useEffect(() => {
    if (screenShareEnabled) {
      shareScreen();
    } else {
      Object.values(users).forEach((user) => {
        if (user.senders.screenShare) {
          user.pc.removeTrack(user.senders.screenShare);
        }
      });
    }
  }, [screenShareEnabled]);

  return (
    <div>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex h-screen justify-between bg-zinc-900">
        <div className="flex flex-grow flex-col p-5">
          <section className="grid flex-grow grid-cols-3 items-start gap-4">
            <Video stream={localStream!} name={"You"} id={socket.id} muted />
            {Object.values(users).map((user, i) => (
              <Video
                key={i}
                stream={user.stream}
                name={"User"}
                id={user.userId}
              />
            ))}
          </section>

          <menu className="flex justify-center gap-3">
            <MediaButton
              enabled={videoEnabled}
              onClick={() => setVideoEnabled((videoEnabled) => !videoEnabled)}
              DisabledIcon={BsCameraVideoOff}
              EnabledIcon={BsCameraVideo}
              type="primary"
            />
            <MediaButton
              enabled={audioEnabled}
              onClick={() => setAudioEnabled((audioEnabled) => !audioEnabled)}
              DisabledIcon={BsMicMute}
              EnabledIcon={BsMic}
              type="primary"
            />
            <MediaButton
              enabled={screenShareEnabled}
              onClick={() => setScreenShareEnabled((enabled) => !enabled)}
              EnabledIcon={MdOutlineScreenShare}
              DisabledIcon={MdOutlineStopScreenShare}
              type="primary"
            />
          </menu>
        </div>

        <div className="shrink-0">
          <Chat socket={socket} />
        </div>
      </div>
    </div>
  );
}
