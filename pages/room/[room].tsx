import Head from "next/head";
import { useEffect, useReducer, useRef, useState } from "react";
import { io } from "socket.io-client";
import Chat from "../../components/Chat";
import negotiate from "../../utils/negotiate";
import {
  BsCameraVideo,
  BsCameraVideoOff,
  BsMic,
  BsMicMute,
} from "react-icons/bs";
import { MdOutlineScreenShare, MdOutlineStopScreenShare } from "react-icons/md";
import MediaButton from "../../components/Button/MediaButton";
import Video from "../../components/Video";
import clsx from "clsx";
import { HiChatBubbleBottomCenterText } from "react-icons/hi2";
import Error from "../../components/Error";
import { useRouter } from "next/router";

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
  username: string;
  muted: boolean;
};

type User = {
  userId: string;
  username: string;
};

export default function Room() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [users, setUsers] = useState<Record<string, ConnectionDetail>>({});
  const [userName, setUserName] = useState("");
  const [showJoinScreen, setShowJoinScreen] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const screenShareTrackIdRef = useRef("");

  const router = useRouter();

  // set socket it & populate user object
  useEffect(() => {
    socket.on("new-user-list", (userList: User[]) => {
      console.log("new-user-list", userList);
      // only a variable is enough
      const socketId = socket.id;
      setUsers((oldUsers) => {
        const usersObj = { ...oldUsers }; // take copy of users instead of getting it's ref as setState would think it's the same object & nothing changed
        userList.forEach(({ userId, username }) => {
          if (!usersObj[userId] && userId !== socketId) {
            const pc = new RTCPeerConnection({
              iceServers: [
                {
                  urls: ["stun:stun1.l.google.com:19302"],
                },
              ],
            });

            pc.ontrack = (event) => {
              setUsers((users) => {
                const usersCopy = { ...users };
                const stream = usersObj[userId].stream;
                stream.getTracks().forEach((track) => {
                  stream.removeTrack(track);
                });
                event.streams[0].getTracks().forEach((track) => {
                  stream.addTrack(track);
                });
                console.log(stream.getTracks());
                stream.dispatchEvent(new TrackEvent("addtrack"));

                return usersCopy;
              });
            };

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("new-ice-candidate", {
                  senderId: socketId,
                  receiverId: userId,
                  candidate: event.candidate.toJSON(),
                });
              }
            };

            pc.onnegotiationneeded = () => {
              negotiate(
                pc,
                socket,
                socketId,
                userId,
                screenShareTrackIdRef.current,
              );
            };

            usersObj[userId] = {
              pc,
              stream: new MediaStream(),
              senders: {
                audio: null,
                video: null,
                screenShare: null,
              },
              userId,
              username,
              muted: true,
            };
          }
        });

        Object.keys(usersObj).forEach((id) => {
          if (userList.map((user) => user.userId).indexOf(id) < 0) {
            usersObj[id].pc.close();
            delete usersObj[id];
          }
        });

        return usersObj;
      });
    });

    //attach other socket listeners
    socket.on("offer-event", async ({ offer, senderId, ssTrackId }) => {
      // only a variable is enough
      const socketId = socket.id;

      await users[senderId].pc.setRemoteDescription(
        new RTCSessionDescription(offer),
      );

      if (offer.type === "offer") {
        // set screen share track id
        screenShareTrackIdRef.current = ssTrackId;

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

        // check if muted
        const muted = users[senderId].stream.getAudioTracks()[0]?.muted;
        setUsers((oldUsers) => ({
          ...oldUsers,
          [senderId]: { ...oldUsers[senderId], muted: muted ?? true },
        }));
      }

      if (offer.type === "answer") {
        console.log("received answer => ", offer);
      }
    });

    socket.on("new-ice-candidate", ({ senderId, candidate, receiverId }) => {
      users[senderId].pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

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
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      videoStream.getTracks().forEach((track) => {
        localStream?.addTrack(track);
        forceUpdate();

        Object.values(users).forEach((user) => {
          const sender = user.pc.addTrack(track, localStream!);
          user.senders.video = sender;
        });
      });
    } catch (e: any) {
      setErrorMessage(e.message);
      setVideoEnabled(false);
    }
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
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      audioStream.getTracks().forEach((track) => {
        localStream?.addTrack(track); // maybe not necessary, as it'll be muted anyway
        localStream?.dispatchEvent(new TrackEvent("addtrack"));

        Object.values(users).forEach((user) => {
          const sender = user.pc.addTrack(track, localStream!);
          user.senders.audio = sender;
        });
      });
    } catch (e: any) {
      setErrorMessage(e.message);
      setAudioEnabled(false);
    }
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
    try {
      const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenCaptureStream.getTracks().forEach((track) => {
        localStream?.addTrack(track);
        forceUpdate();

        // set screen share track id
        screenShareTrackIdRef.current = track.id;

        Object.values(users).forEach((user) => {
          const sender = user.pc.addTrack(track, localStream!);
          user.senders.screenShare = sender;
        });
      });

      screenCaptureStream.onremovetrack = () => {
        console.log("track removed");
      };
    } catch (e: any) {
      setErrorMessage(e.message);
      setScreenShareEnabled(false);
    }
  }

  useEffect(() => {
    if (screenShareEnabled) {
      shareScreen();
    } else {
      const screenShareTrack = localStream?.getTrackById(
        screenShareTrackIdRef.current,
      );

      screenShareTrack && localStream?.removeTrack(screenShareTrack);

      // reset screen share track id
      screenShareTrackIdRef.current = "";
      forceUpdate();

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

      {errorMessage && (
        <div className="fixed top-5 left-5 z-50">
          <Error
            errorMessage={errorMessage}
            onTimeOut={() => setErrorMessage("")}
          />
        </div>
      )}

      <div
        className={clsx(
          "fixed inset-0 z-10 flex items-center justify-center bg-zinc-900/95",
          { hidden: !showJoinScreen },
        )}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowJoinScreen(false);
            socket.auth = {
              username: userName,
              room: router.query.room,
            };
            socket.connect();
            socket.emit("join", userName);
          }}
        >
          <label htmlFor="username" className="text-white">
            Enter Your Name:
          </label>
          <input
            type="text"
            id="username"
            className="mt-2 block rounded px-4 py-2"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button className="mt-2 block w-full rounded bg-blue-500 px-4 py-2 text-white">
            Join
          </button>
        </form>
      </div>

      <div className="relative flex h-screen justify-between overflow-hidden bg-zinc-900">
        <div className="flex flex-grow flex-col">
          <div className="thin-scroll flex-grow overflow-auto p-5 pb-px">
            <section className="grid flex-grow grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Video
                stream={localStream!}
                name={"You"}
                id={socket.id}
                muted
                showMute={!audioEnabled}
                ssTrackId={screenShareTrackIdRef.current}
              />
              {Object.values(users).map((user, i) => (
                <Video
                  key={i}
                  stream={user.stream}
                  name={user.username}
                  id={user.userId}
                  showMute={user.muted}
                  ssTrackId={screenShareTrackIdRef.current}
                />
              ))}
            </section>
          </div>

          <menu className="relative flex justify-center gap-3 p-5">
            <hgroup className="absolute left-5 hidden text-white lg:block">
              <h1 className="font-bold">{userName}</h1>
              <p>{socket.id}</p>
            </hgroup>
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
            <MediaButton
              onClick={() => setShowChat((showChat) => !showChat)}
              Icon={HiChatBubbleBottomCenterText}
              type="secondary"
              className="absolute right-5 sm:hidden"
            />
          </menu>
        </div>

        <div
          className={clsx(
            "absolute right-0 bottom-20 top-0 shrink-0 transition-transform sm:static sm:translate-x-0",
            { "translate-x-full": !showChat },
          )}
        >
          <Chat socket={socket} userName={userName} />
        </div>
      </div>
    </div>
  );
}
